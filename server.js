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
let resolvedGames = [];
const gamesFile = path.join('/var/data', 'games.json');
const resolvedGamesFile = path.join('/var/data', 'resolved_games.json');

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
      console.error('❌ Error loading open games from disk:', e);
    }
  }
}

// Save games to disk
function saveGamesToDisk() {
  try {
    fs.writeFileSync(gamesFile, JSON.stringify(openGames, null, 2));
    console.log('✅ Saved open games to disk');
  } catch (e) {
    console.error('❌ Error saving open games to disk:', e);
  }
}

// Load resolved games from disk
function loadResolvedGamesFromDisk() {
  if (fs.existsSync(resolvedGamesFile)) {
    try {
      resolvedGames = JSON.parse(fs.readFileSync(resolvedGamesFile));
      console.log('✅ Loaded resolved games from disk');
    } catch (e) {
      console.error('❌ Error loading resolved games from disk:', e);
    }
  }
}

// Save resolved games to disk
function saveResolvedGamesToDisk() {
  try {
    fs.writeFileSync(resolvedGamesFile, JSON.stringify(resolvedGames, null, 2));
    console.log('✅ Saved resolved games to disk');
  } catch (e) {
    console.error('❌ Error saving resolved games to disk:', e);
  }
}

async function setupProvider() {
  let provider;
  try {
    provider = new ethers.providers.WebSocketProvider(process.env.ALCHEMY_WSS_URL);
    provider.on('error', (error) => {
      console.error('WebSocket error:', error);
      setTimeout(setupProvider, 5000);
    });
    provider.on('close', (code, reason) => {
      console.log(`WebSocket closed with code ${code}, reason: ${reason || 'unknown'}`);
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
  loadResolvedGamesFromDisk();

  // Fetch open games
  async function fetchOpenGames() {
    try {
      const openIds = await contract.getOpenGames();
      openGames = [];
      for (let id of openIds) {
        try {
          const game = await contract.getGame(id);
          let image = 'https://via.placeholder.com/80';
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
      saveGamesToDisk();
    } catch (error) {
      console.error('Error fetching open games:', error);
    }
  }

  // Fetch NFT image
  async function getNFTImage(tokenId) {
    try {
      let uri = await nftContract.tokenURI(tokenId);
      if (uri.startsWith('ipfs://')) uri = 'https://ipfs.io/ipfs/' + uri.slice(7);
      const response = await fetch(uri);
      const metadata = await response.json();
      let image = metadata.image;
      if (image.startsWith('ipfs://')) image = 'https://ipfs.io/ipfs/' + image.slice(7);
      return image;
    } catch (error) {
      console.error(`Error fetching image for token ${tokenId}:`, error);
      return 'https://via.placeholder.com/64';
    }
  }

  // Event listeners
  contract.on('GameCreated', async (gameId, player1, tokenId1) => {
    console.log('GameCreated:', gameId.toString(), 'Player:', player1);
    await fetchOpenGames();
  });

  contract.on('GameJoined', async (gameId, player2, tokenId2) => {
    console.log('GameJoined:', gameId.toString(), 'Player:', player2);
    const game = await contract.getGame(gameId);
    const image1 = await getNFTImage(game.tokenId1);
    const image2 = await getNFTImage(tokenId2);
    io.emit('gameJoined', {
      gameId: gameId.toString(),
      player1: game.player1,
      tokenId1: game.tokenId1.toString(),
      image1,
      player2,
      tokenId2: tokenId2.toString(),
      image2,
      joinTimestamp: game.joinTimestamp.toString()
    });
    resolvedGames.push({
      gameId: gameId.toString(),
      player1: game.player1,
      tokenId1: game.tokenId1.toString(),
      image1,
      player2,
      tokenId2: tokenId2.toString(),
      image2,
      resolved: false,
      userResolved: {
        [game.player1.toLowerCase()]: false,
        [player2.toLowerCase()]: false
      },
      viewed: {
        [game.player1.toLowerCase()]: false,
        [player2.toLowerCase()]: false
      }
    });
    saveResolvedGamesToDisk();
    await fetchOpenGames();
  });

  contract.on('GameResolved', async (gameId, winner, tokenId1, tokenId2) => {
    console.log('GameResolved:', gameId.toString(), 'Winner:', winner);
    const image1 = await getNFTImage(tokenId1);
    const image2 = await getNFTImage(tokenId2);
    resolvedGames = resolvedGames.map(game => 
      game.gameId === gameId.toString() ? { 
        ...game, 
        winner, 
        resolved: true, 
        image1, 
        image2, 
        viewed: {
          ...game.viewed,
          [game.player1.toLowerCase()]: false,
          [game.player2.toLowerCase()]: false
        }
      } : game
    );
    saveResolvedGamesToDisk();
    await fetchOpenGames();
  });

  contract.on('GameCanceled', async (gameId) => {
    console.log('GameCanceled:', gameId.toString());
    resolvedGames = resolvedGames.filter(game => game.gameId !== gameId.toString());
    saveResolvedGamesToDisk();
    await fetchOpenGames();
  });

  // Initial fetch
  await fetchOpenGames();

  // Periodically fetch open games to sync with blockchain
  setInterval(async () => {
    console.log('Periodic fetch of open games');
    await fetchOpenGames();
  }, 60000);

  // Periodically emit openGames to keep clients synced
  setInterval(() => {
    console.log('Emitting periodic openGamesUpdate');
    io.emit('openGamesUpdate', openGames);
  }, 10000);

  // Socket.IO event listeners
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.emit('openGamesUpdate', openGames);
    setTimeout(() => {
      socket.emit('openGamesUpdate', openGames);
    }, 3000);

    socket.on('fetchResolvedGames', ({ account }) => {
      console.log('Fetching resolved games for account:', account);
      const userGames = resolvedGames.filter(game => 
        game.player1.toLowerCase() === account.toLowerCase() || 
        (game.player2 && game.player2.toLowerCase() === account.toLowerCase())
      );
      socket.emit('resolvedGames', userGames);
    });

    socket.on('resolveGame', async ({ gameId, account }) => {
      console.log('Resolving game:', gameId, 'for account:', account.toLowerCase());
      const resolvedGame = resolvedGames.find(g => g.gameId === gameId);
      if (!resolvedGame) {
        socket.emit('gameResolution', { gameId, error: 'Game not found' });
        return;
      }
      if (resolvedGame.resolved) {
        socket.emit('gameResolution', {
          gameId,
          winner: resolvedGame.winner,
          tokenId1: resolvedGame.tokenId1,
          tokenId2: resolvedGame.tokenId2,
          image1: resolvedGame.image1,
          image2: resolvedGame.image2,
          resolved: true
        });
        resolvedGames = resolvedGames.map(g => 
          g.gameId === gameId ? { 
            ...g, 
            userResolved: { 
              ...g.userResolved, 
              [account.toLowerCase()]: true 
            } 
          } : g
        );
        saveResolvedGamesToDisk();
      } else {
        socket.emit('gameResolution', { gameId, resolved: false });
      }
    });

    socket.on('markGamesViewed', ({ account, gameIds }) => {
      console.log('Marking games viewed for account:', account.toLowerCase(), 'gameIds:', gameIds);
      resolvedGames = resolvedGames.map(game => 
        gameIds.includes(game.gameId) && 
        (game.player1.toLowerCase() === account.toLowerCase() || 
         (game.player2 && game.player2.toLowerCase() === account.toLowerCase())) 
          ? { 
              ...game, 
              viewed: { 
                ...game.viewed, 
                [account.toLowerCase()]: true 
              } 
            } 
          : game
      );
      saveResolvedGamesToDisk();
      const userGames = resolvedGames.filter(game => 
        game.player1.toLowerCase() === account.toLowerCase() || 
        (game.player2 && game.player2.toLowerCase() === account.toLowerCase())
      );
      socket.emit('resolvedGames', userGames);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}

app.get('/', (req, res) => {
  res.send('Sketchy Flips Backend');
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initializeContract();
});