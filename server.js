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
        origin: ['https://sketchyflips.vercel.app', 'http://localhost:3000'],
        methods: ['GET', 'POST']
    }
});

const gameAddress = '0xf6b8d2E0d36669Ed82059713BDc6ACfABe11Fde6';
const nftAddress = '0x08533a2b16e3db03eebd5b23210122f97dfcb97d';

const gameABI = [
    "event GameCreated(uint256 gameId, address player1, uint256 tokenId1)",
    "event GameJoined(uint256 gameId, address player2, uint256 tokenId2)",
    "event GameResolved(uint256 gameId, address winner, uint256 tokenId1, uint256 tokenId2)",
    "event GameCanceled(uint256 gameId)",
    "function getOpenGames() view returns (uint256[])",
    "function getGame(uint256 gameId) view returns (tuple(address player1, uint256 tokenId1, address player2, uint256 tokenId2, bool active, uint256 requestId, bytes data, uint256 joinTimestamp, uint256 createTimestamp))"
];

const nftABI = ["function tokenURI(uint256 tokenId) view returns (string)"];

// Persistent game state with user tracking
let openGames = [];
let resolvedGames = [];
let userSessions = new Map(); // Map<address, socketId>
const dataDir = '/data';
const gamesFile = path.join(dataDir, 'games.json');
const resolvedGamesFile = path.join(dataDir, 'resolved_games.json');
const resolvedGamesByUserFile = path.join(dataDir, 'resolved_games_by_user.json');

// Ensure the data folder exists
if (!fs.existsSync(dataDir)) {
    try {
        fs.mkdirSync(dataDir, { recursive: true });
    } catch (e) {
        console.error('❌ Error creating /data:', e);
        process.exit(1);
    }
}

// Load games from disk
function loadGamesFromDisk() {
    if (fs.existsSync(gamesFile)) {
        try {
            openGames = JSON.parse(fs.readFileSync(gamesFile));
            console.log('✅ Loaded open games from /data/games.json');
        } catch (e) {
            console.error('❌ Error loading open games from /data/games.json:', e);
        }
    }
}

// Save games to disk
function saveGamesToDisk() {
    try {
        fs.writeFileSync(gamesFile, JSON.stringify(openGames, null, 2));
        console.log('✅ Saved open games to /data/games.json');
    } catch (e) {
        console.error('❌ Error saving open games to /data/games.json:', e);
    }
}

// Load resolved games from disk
function loadResolvedGamesFromDisk() {
    if (fs.existsSync(resolvedGamesFile)) {
        try {
            resolvedGames = JSON.parse(fs.readFileSync(resolvedGamesFile));
            console.log('✅ Loaded resolved games from /data/resolved_games.json');
        } catch (e) {
            console.error('❌ Error loading resolved games from /data/resolved_games.json:', e);
        }
    }
}

// Save resolved games to disk
function saveResolvedGamesToDisk() {
    try {
        fs.writeFileSync(resolvedGamesFile, JSON.stringify(resolvedGames, null, 2));
        console.log('✅ Saved resolved games to /data/resolved_games.json');
    } catch (e) {
        console.error('❌ Error saving resolved games to /data/resolved_games.json:', e);
    }
}

// Load resolved games by user from disk
function loadResolvedGamesByUser() {
    if (!fs.existsSync(resolvedGamesByUserFile)) return {};
    try {
        return JSON.parse(fs.readFileSync(resolvedGamesByUserFile));
    } catch (e) {
        console.error('❌ Error loading resolved games by user from /data/resolved_games_by_user.json:', e);
        return {};
    }
}

// Save resolved games by user to disk
function saveResolvedGamesByUser(data) {
    try {
        fs.writeFileSync(resolvedGamesByUserFile, JSON.stringify(data, null, 2));
        console.log('✅ Saved resolved games by user to /data/resolved_games_by_user.json');
    } catch (e) {
        console.error('❌ Error saving resolved games by user to /data/resolved_games_by_user.json:', e);
    }
}

let resolvedGamesByUser = loadResolvedGamesByUser();

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
        return null;
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
                        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                        const metadata = await response.json();
                        image = metadata.image.startsWith('ipfs://') ? 'https://ipfs.io/ipfs/' + metadata.image.slice(7) : metadata.image;
                    } catch (error) {
                        console.error(`Error fetching metadata for token ${game.tokenId1}:`, error);
                    }
                    openGames.push({
                        id: id.toString(),
                        player1: game.player1.toLowerCase(),
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

    // Fetch resolved games for an account
    async function fetchResolvedGamesForAccount(accountLower) {
        try {
            resolvedGames = resolvedGames.filter(game => 
                game.player1 === accountLower || (game.player2 && game.player2 === accountLower)
            );
            for (let i = 0; i < 1000; i++) {
                try {
                    const game = await contract.getGame(i);
                    if (!game.active && 
                        (game.player1.toLowerCase() === accountLower || 
                         (game.player2 && game.player2.toLowerCase() === accountLower)) &&
                        !resolvedGames.some(g => g.gameId === i.toString())) {
                        const image1 = await getNFTImage(game.tokenId1);
                        const image2 = await getNFTImage(game.tokenId2);
                        const winner = game.data && game.data.length > 0 ? 
                            ethers.utils.hexZeroPad(ethers.utils.hexStripZeros(game.data), 20).toLowerCase() : 
                            null;
                        resolvedGames.push({
                            gameId: i.toString(),
                            player1: game.player1.toLowerCase(),
                            tokenId1: game.tokenId1.toString(),
                            image1,
                            player2: game.player2 ? game.player2.toLowerCase() : null,
                            tokenId2: game.tokenId2.toString(),
                            image2,
                            resolved: true,
                            winner,
                            userResolved: {
                                [game.player1.toLowerCase()]: false,
                                [game.player2 ? game.player2.toLowerCase() : '']: false
                            },
                            viewed: {
                                [game.player1.toLowerCase()]: false,
                                [game.player2 ? game.player2.toLowerCase() : '']: false
                            }
                        });
                    }
                } catch (e) {
                    if (e.message.includes('revert') || e.message.includes('out of bounds')) break;
                }
            }
            saveResolvedGamesToDisk();
            const userResolvedGames = new Set(resolvedGamesByUser[accountLower] || []);
            return resolvedGames.filter(game => 
                (game.player1 === accountLower || 
                (game.player2 && game.player2 === accountLower)) &&
                !userResolvedGames.has(game.gameId)
            );
        } catch (error) {
            console.error('Error fetching resolved games:', error);
            const userResolvedGames = new Set(resolvedGamesByUser[accountLower] || []);
            return resolvedGames.filter(game => 
                (game.player1 === accountLower || 
                (game.player2 && game.player2 === accountLower)) &&
                !userResolvedGames.has(game.gameId)
            );
        }
    }

    // Fetch NFT image
    async function getNFTImage(tokenId) {
        try {
            let uri = await nftContract.tokenURI(tokenId);
            console.log(`Fetching metadata for token ${tokenId}: ${uri}`);
            if (uri.startsWith('ipfs://')) uri = 'https://ipfs.io/ipfs/' + uri.slice(7);
            const response = await fetch(uri);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const metadata = await response.json();
            let image = metadata.image;
            console.log(`Image URL for token ${tokenId}: ${image}`);
            if (image && image.startsWith('ipfs://')) image = 'https://ipfs.io/ipfs/' + image.slice(7);
            return image || 'https://via.placeholder.com/64';
        } catch (error) {
            console.error(`Error fetching image for token ${tokenId}:`, error.message);
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
        const gameData = {
            gameId: gameId.toString(),
            player1: game.player1.toLowerCase(),
            tokenId1: game.tokenId1.toString(),
            image1,
            player2: player2.toLowerCase(),
            tokenId2: tokenId2.toString(),
            image2,
            joinTimestamp: game.joinTimestamp.toString(),
            resolved: false,
            userResolved: {
                [game.player1.toLowerCase()]: false,
                [player2.toLowerCase()]: false
            },
            viewed: {
                [game.player1.toLowerCase()]: false,
                [player2.toLowerCase()]: false
            }
        };
        resolvedGames.push(gameData);
        saveResolvedGamesToDisk();
        const player1Socket = userSessions.get(game.player1.toLowerCase());
        const player2Socket = userSessions.get(player2.toLowerCase());
        if (player1Socket) io.to(player1Socket).emit('gameJoined', gameData);
        if (player2Socket) io.to(player2Socket).emit('gameJoined', gameData);
        await fetchOpenGames();
    });

    contract.on('GameResolved', async (gameId, winner, tokenId1, tokenId2) => {
        console.log('GameResolved:', gameId.toString(), 'Winner:', winner.toLowerCase());
        const image1 = await getNFTImage(tokenId1);
        const image2 = await getNFTImage(tokenId2);
        resolvedGames = resolvedGames.map(game => 
            game.gameId === gameId.toString() ? { 
                ...game, 
                winner: winner.toLowerCase(), 
                resolved: true, 
                image1, 
                image2, 
                viewed: {
                    ...game.viewed,
                    [game.player1.toLowerCase()]: false,
                    [game.player2 ? game.player2.toLowerCase() : '']: false
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

    // Socket.IO event listeners
    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);

        socket.on('registerAddress', ({ address }) => {
            console.log(`Registering address ${address} with socket ${socket.id}`);
            userSessions.set(address.toLowerCase(), socket.id);
        });

        socket.emit('openGamesUpdate', openGames);
        setTimeout(() => {
            socket.emit('openGamesUpdate', openGames);
        }, 3000);

        socket.on('fetchResolvedGames', async ({ account }) => {
            const accountLower = account.toLowerCase();
            console.log('Fetching resolved games for account:', accountLower);
            const userGames = await fetchResolvedGamesForAccount(accountLower);
            socket.emit('resolvedGames', userGames);
        });

        socket.on('resolveGame', async ({ gameId, account }) => {
            const accountLower = account.toLowerCase();
            console.log('Resolving game:', gameId, 'for account:', accountLower);
            let resolvedGame = resolvedGames.find(g => g.gameId === gameId);
            if (!resolvedGame) {
                // Fallback: check contract
                try {
                    const game = await contract.getGame(gameId);
                    if (game.player1.toLowerCase() === accountLower || 
                        (game.player2 && game.player2.toLowerCase() === accountLower)) {
                        const image1 = await getNFTImage(game.tokenId1);
                        const image2 = await getNFTImage(game.tokenId2);
                        const winner = game.data && game.data.length > 0 ? 
                            ethers.utils.hexZeroPad(ethers.utils.hexStripZeros(game.data), 20).toLowerCase() : 
                            null;
                        resolvedGame = {
                            gameId: gameId.toString(),
                            player1: game.player1.toLowerCase(),
                            tokenId1: game.tokenId1.toString(),
                            image1,
                            player2: game.player2 ? game.player2.toLowerCase() : null,
                            tokenId2: game.tokenId2.toString(),
                            image2,
                            resolved: !game.active,
                            winner,
                            userResolved: {
                                [game.player1.toLowerCase()]: false,
                                [game.player2 ? game.player2.toLowerCase() : '']: false
                            },
                            viewed: {
                                [game.player1.toLowerCase()]: false,
                                [game.player2 ? game.player2.toLowerCase() : '']: false
                            }
                        };
                        resolvedGames.push(resolvedGame);
                        saveResolvedGamesToDisk();
                    } else {
                        socket.emit('gameResolution', { gameId, error: 'Game not found or user not a player' });
                        return;
                    }
                } catch (error) {
                    console.error(`Error fetching game ${gameId} from contract:`, error);
                    socket.emit('gameResolution', { gameId, error: 'Game not found' });
                    return;
                }
            }
            resolvedGame.userResolved[accountLower] = true;
            resolvedGame.viewed[accountLower] = true;
            saveResolvedGamesToDisk();
            if (!resolvedGamesByUser[accountLower]) resolvedGamesByUser[accountLower] = [];
            if (!resolvedGamesByUser[accountLower].includes(gameId)) {
                resolvedGamesByUser[accountLower].push(gameId);
                saveResolvedGamesByUser(resolvedGamesByUser);
            }
            if (resolvedGame.resolved && resolvedGame.winner) {
                socket.emit('gameResolution', {
                    gameId,
                    winner: resolvedGame.winner,
                    tokenId1: resolvedGame.tokenId1,
                    tokenId2: resolvedGame.tokenId2,
                    image1: resolvedGame.image1,
                    image2: resolvedGame.image2,
                    resolved: true
                });
                // Remove the game for the user
                resolvedGames = resolvedGames.filter(g => g.gameId !== gameId);
                saveResolvedGamesToDisk();
                const userResolvedGames = new Set(resolvedGamesByUser[accountLower] || []);
                const userGames = resolvedGames.filter(game => 
                    (game.player1 === accountLower || 
                    (game.player2 && game.player2 === accountLower)) &&
                    !userResolvedGames.has(game.gameId)
                );
                socket.emit('resolvedGames', userGames);
            } else {
                socket.emit('gameResolution', { gameId, error: 'Game not resolved or no winner' });
            }
        });

        socket.on('markGameResolved', ({ gameId, account }) => {
            const accountLower = account.toLowerCase();
            console.log('Marking game resolved for game:', gameId, 'account:', accountLower);
            resolvedGames = resolvedGames.map(game => 
                game.gameId === gameId ? {
                    ...game,
                    userResolved: { ...game.userResolved, [accountLower]: true },
                    viewed: { ...game.viewed, [accountLower]: true }
                } : game
            );
            if (!resolvedGamesByUser[accountLower]) resolvedGamesByUser[accountLower] = [];
            if (!resolvedGamesByUser[accountLower].includes(gameId)) {
                resolvedGamesByUser[accountLower].push(gameId);
                saveResolvedGamesByUser(resolvedGamesByUser);
            }
            saveResolvedGamesToDisk();
            const userResolvedGames = new Set(resolvedGamesByUser[accountLower] || []);
            const userGames = resolvedGames.filter(game => 
                (game.player1 === accountLower || 
                (game.player2 && game.player2 === accountLower)) &&
                !userResolvedGames.has(game.gameId)
            );
            socket.emit('resolvedGames', userGames);
        });

        socket.on('removeGame', ({ gameId, account }) => {
            const accountLower = account.toLowerCase();
            console.log('Removing game:', gameId, 'for account:', accountLower);
            resolvedGames = resolvedGames.filter(game => game.gameId !== gameId);
            if (!resolvedGamesByUser[accountLower]) resolvedGamesByUser[accountLower] = [];
            if (!resolvedGamesByUser[accountLower].includes(gameId)) {
                resolvedGamesByUser[accountLower].push(gameId);
                saveResolvedGamesByUser(resolvedGamesByUser);
            }
            saveResolvedGamesToDisk();
            const userResolvedGames = new Set(resolvedGamesByUser[accountLower] || []);
            const userGames = resolvedGames.filter(game => 
                (game.player1 === accountLower || 
                (game.player2 && game.player2 === accountLower)) &&
                !userResolvedGames.has(game.gameId)
            );
            socket.emit('resolvedGames', userGames);
        });

        socket.on('markGamesViewed', ({ account, gameIds }) => {
            const accountLower = account.toLowerCase();
            console.log('Marking games viewed for account:', accountLower, 'gameIds:', gameIds);
            resolvedGames = resolvedGames.map(game => 
                gameIds.includes(game.gameId) && 
                (game.player1 === accountLower || 
                 (game.player2 && game.player2 === accountLower)) 
                  ? { 
                      ...game, 
                      viewed: { 
                        ...game.viewed, 
                        [accountLower]: true 
                      } 
                    } 
                  : game
            );
            saveResolvedGamesToDisk();
            const userResolvedGames = new Set(resolvedGamesByUser[accountLower] || []);
            const userGames = resolvedGames.filter(game => 
                (game.player1 === accountLower || 
                (game.player2 && game.player2 === accountLower)) &&
                !userResolvedGames.has(game.gameId)
            );
            socket.emit('resolvedGames', userGames);
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
            for (let [address, socketId] of userSessions.entries()) {
                if (socketId === socket.id) {
                    userSessions.delete(address);
                    console.log(`Removed session for address ${address}`);
                }
            }
        });
    });
}

app.get('/', (req, res) => {
    res.json({ status: 'Sketchy Flips Backend Running' });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    initializeContract();
});