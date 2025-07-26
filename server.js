const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const ethers = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'https://sketchyflips.vercel.app',
    methods: ['GET', 'POST']
  }
});

// Blockchain setup
const gameAddress = '0xf6b8d2E0d36669Ed82059713BDc6ACfABe11Fde6';
const gameABI = [
  "event GameCreated(uint256 gameId, address player1, uint256 tokenId1)",
  "event GameJoined(uint256 gameId, address player2, uint256 tokenId2)",
  "event GameResolved(uint256 gameId, address winner, uint256 tokenId1, uint256 tokenId2)",
  "event GameCanceled(uint256 gameId)",
  "function getOpenGames() view returns (uint256[])",
  "function getGame(uint256 gameId) view returns (tuple(address player1, uint256 tokenId1, address player2, uint256 tokenId2, bool active, uint256 requestId, bytes data, uint256 joinTimestamp, uint256 createTimestamp))"
];

const nftAddress = '0x08533a2b16e3db03eebd5b23210122f97dfcb97d';
const nftABI = ["function tokenURI(uint256 tokenId) view returns (string)"];

// Persistent game state
let openGames = [];
const gamesFile = path.join('/var/data', 'games.json'); // Render disk mount path

// Ensure the data folder exists
if (!fs.existsSync('/var/data')) {
  fs.mkdirSync('/var/data', { recursive: true });
}

// Load games from disk
function loadGamesFromDisk() {
  if (fs.existsSync(gamesFile)) {
    try {
      openGames = JSON.parse(fs.readFileSync(gamesFile));
      console.log('✅ Loaded open games from disk');
    } catch (e) {
      console.error('❌ Error loading games from disk:', e);
    }
  }
}

// Save games to disk
function saveGamesToDisk() {
  try {
    fs.writeFileSync(gamesFile, JSON.stringify(openGames, null, 2));
    console.log('✅ Saved open games to disk');
  } catch (e) {
    console.error('❌ Error saving games to disk:', e);
  }
}

async function setupProvider() {
  let provider;
  try {
    provider = new ethers.providers.WebSocketProvider(process.env.ALCHEMY_WSS_URL);
    provider.on('error', (error) => {
      console.error('WebSocket error:', error);
      setTimeout(setupProvider, 5000); // Retry after 5 seconds
    });
    provider.on('close', () => {
      console.log('WebSocket closed, reconnecting...');
      setTimeout(setupProvider, 5000);
    });
  } catch (error) {
    console.error('Provider setup error:', error);
    setTimeout(setupProvider, 5000);
    return;
  }
  return provider;
}

async function initializeContract() {
  const provider = await setupProvider();
  if (!provider) return;
  const contract = new ethers.Contract(gameAddress, gameABI, provider);
  const nftContract = new ethers.Contract(nftAddress, nftABI, provider);

  // Load games from disk on startup
  loadGamesFromDisk();

  // Fetch open games
  async function fetchOpenGames() {
    try {
      const openIds = await contract.getOpenGames();
      openGames = [];
      for (let id of openIds) {
        try {
          const game = await contract.getGame(id);
          let image = 'https://via.placeholder.com/80'; // Fallback image
          try {
            let uri = await nftContract.tokenURI(game.tokenId1);
            if (uri.startsWith('ipfs://')) uri = 'https://ipfs.io/ipfs/' + uri.slice(7);
            const response = await fetch(uri);
            const metadata = await response.json();
            image = metadata.image.startsWith('ipfs://') ? 'https://ipfs.io/ipfs/' + metadata.image.slice(7) : metadata.image;
          } catch (error) {
            console.error(`Error fetching metadata for token ${game.tokenId1}:`, error);
          }
          openGames.push({
            id: id.toString(),
            player1: game.player1,
            tokenId1: game.tokenId1.toString(),
            image,
            createdAt: new Date(Number(game.createTimestamp) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            createTimestamp: game.createTimestamp.toString()
          });
        } catch (error) {
          console.error(`Error fetching game ${id}:`, error);
        }
      }
      console.log('Broadcasting open games:', openGames);
      io.emit('openGamesUpdate', openGames);
      saveGamesToDisk(); // Save to disk after fetching
    } catch (error) {
      console.error('Error fetching open games:', error);
    }
  }

  // Event listeners
  contract.on('GameCreated', async (gameId, player1, tokenId1) => {
    console.log('GameCreated:', gameId.toString(), 'Player:', player1);
    await fetchOpenGames();
  });

  contract.on('GameJoined', async (gameId, player2, tokenId2) => {
    console.log('GameJoined:', gameId.toString(), 'Player:', player2);
    await fetchOpenGames();
  });

  contract.on('GameResolved', async (gameId, winner, tokenId1, tokenId2) => {
    console.log('GameResolved:', gameId.toString(), 'Winner:', winner);
    await fetchOpenGames();
    io.emit('gameResolved', {
      gameId: gameId.toString(),
      winner,
      tokenId1: tokenId1.toString(),
      tokenId2: tokenId2.toString()
    });
  });

  contract.on('GameCanceled', async (gameId) => {
    console.log('GameCanceled:', gameId.toString());
    await fetchOpenGames();
  });

  // Initial fetch
  await fetchOpenGames();

  // Periodically emit openGames to keep clients synced
  setInterval(() => {
    console.log('Emitting periodic openGamesUpdate');
    io.emit('openGamesUpdate', openGames);
  }, 10000); // Every 10 seconds
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.emit('openGamesUpdate', openGames); // Send immediately on connect
  setTimeout(() => {
    socket.emit('openGamesUpdate', openGames); // Send again after 3 seconds
  }, 3000);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.get('/', (req, res) => {
  res.send('Sketchy Flips Backend');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initializeContract();
});