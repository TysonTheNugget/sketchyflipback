const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const ethers = require('ethers');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Update to your Vercel URL in production (e.g., https://your-vercel-app.vercel.app)
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

const provider = new ethers.providers.WebSocketProvider(process.env.ALCHEMY_WSS_URL);
const contract = new ethers.Contract(gameAddress, gameABI, provider);

// Game state cache
let openGames = [];

// Fetch open games and fetch token URI for images
async function fetchOpenGames() {
  try {
    const openIds = await contract.getOpenGames();
    openGames = [];
    const nftContract = new ethers.Contract('0x08533a2b16e3db03eebd5b23210122f97dfcb97d', ["function tokenURI(uint256 tokenId) view returns (string)"], provider);
    for (let id of openIds) {
      const game = await contract.getGame(id);
      let uri = await nftContract.tokenURI(game.tokenId1);
      if (uri.startsWith('ipfs://')) uri = 'https://ipfs.io/ipfs/' + uri.slice(7);
      const response = await fetch(uri);
      const metadata = await response.json();
      let image = metadata.image;
      if (image.startsWith('ipfs://')) image = 'https://ipfs.io/ipfs/' + image.slice(7);
      openGames.push({
        id: id.toString(),
        player1: game.player1,
        tokenId1: game.tokenId1.toString(),
        image: image,
        createdAt: new Date(Number(game.createTimestamp) * 1000).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
      });
    }
    io.emit('openGamesUpdate', openGames);
  } catch (error) {
    console.error('Error fetching open games:', error);
  }
}

// Event listeners
contract.on('GameCreated', async (gameId, player1, tokenId1) => {
  console.log('GameCreated:', gameId.toString());
  await fetchOpenGames();
});

contract.on('GameJoined', async (gameId, player2, tokenId2) => {
  console.log('GameJoined:', gameId.toString());
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

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.emit('openGamesUpdate', openGames);
});

app.get('/', (req, res) => {
  res.send('Sketchy Flips Backend');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  fetchOpenGames();
});