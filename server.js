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

const daycareAddress = '0xd32247484111569930a0b9c7e669e8E108392496';
const daycareABI = [{"inputs":[{"internalType":"address","name":"_nftAddress","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"OwnableInvalidOwner","type":"error"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"OwnableUnauthorizedAccount","type":"error"},{"inputs":[],"name":"ReentrancyGuardReentrantCall","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Claimed","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"startTime","type":"uint256"}],"name":"DroppedOff","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"PickedUp","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"PointsAdded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"PointsBurned","type":"event"},{"anonymous":false,"inputs":[],"name":"PointsEditingLocked","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"}],"name":"UserAdded","type":"event"},{"inputs":[{"internalType":"address","name":"user","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"addPoints","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address[]","name":"users","type":"address[]"},{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"name":"addPointsBatch","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"burnPoints","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256[]","name":"daycareIndices","type":"uint256[]"}],"name":"claimMultiple","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"daycareIndex","type":"uint256"}],"name":"claimPoints","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"daycares","outputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint256","name":"startTime","type":"uint256"},{"internalType":"uint256","name":"claimedPoints","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"dropOff","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256[]","name":"tokenIds","type":"uint256[]"}],"name":"dropOffMultiple","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getDaycares","outputs":[{"components":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint256","name":"startTime","type":"uint256"},{"internalType":"uint256","name":"claimedPoints","type":"uint256"}],"internalType":"struct MymilioDaycare.DaycareInfo[]","name":"","type":"tuple[]"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getLeaderboard","outputs":[{"internalType":"address[]","name":"","type":"address[]"},{"internalType":"uint256[]","name":"","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"},{"internalType":"uint256","name":"daycareIndex","type":"uint256"}],"name":"getPendingPoints","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getTotalPoints","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"lockPointsEditing","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"nft","outputs":[{"internalType":"contract IERC721","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"daycareIndex","type":"uint256"}],"name":"pickUp","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256[]","name":"daycareIndices","type":"uint256[]"}],"name":"pickUpMultiple","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"points","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"pointsEditingLocked","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"pointsPerDay","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"userAddresses","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}];

// Persistent game storage
let openGames = [];
let resolvedGames = [];
let userSessions = new Map(); // Map<address, socketId>
const dataDir = '/var/data';
const gamesFile = path.join(dataDir, 'games.json');
const resolvedGamesFile = path.join(dataDir, 'resolved_games.json');
const resolvedGamesByUserFile = path.join(dataDir, 'resolved_games_by_user.json');

// Daycare storage
let leaderboard = []; // Array of { address: string, points: string }
const leaderboardFile = path.join(dataDir, 'leaderboard.json');

// Ensure the data folder exists
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
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

// Load resolved games by user from disk
function loadResolvedGamesByUser() {
    if (!fs.existsSync(resolvedGamesByUserFile)) return {};
    try {
        return JSON.parse(fs.readFileSync(resolvedGamesByUserFile));
    } catch (e) {
        console.error('❌ Error loading resolved games by user from disk:', e);
        return {};
    }
}

// Save resolved games by user to disk
function saveResolvedGamesByUser(data) {
    try {
        fs.writeFileSync(resolvedGamesByUserFile, JSON.stringify(data, null, 2));
        console.log('✅ Saved resolved games by user to disk');
    } catch (e) {
        console.error('❌ Error saving resolved games by user to disk:', e);
    }
}

let resolvedGamesByUser = loadResolvedGamesByUser();

// Load leaderboard from disk
function loadLeaderboardFromDisk() {
    if (fs.existsSync(leaderboardFile)) {
        try {
            leaderboard = JSON.parse(fs.readFileSync(leaderboardFile));
            console.log('✅ Loaded leaderboard from disk');
        } catch (e) {
            console.error('❌ Error loading leaderboard from disk:', e);
        }
    }
}

// Save leaderboard to disk
function saveLeaderboardToDisk() {
    try {
        fs.writeFileSync(leaderboardFile, JSON.stringify(leaderboard, null, 2));
        console.log('✅ Saved leaderboard to disk');
    } catch (e) {
        console.error('❌ Error saving leaderboard to disk:', e);
    }
}

async function setupProvider() {
    let provider;
    try {
        provider = new ethers.providers.WebSocketProvider(process.env.ALCHEMY_WSS_URL);
        provider.on('error', (error) => {
            console.error('WebSocket error:', error.message);
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
    const daycareContract = new ethers.Contract(daycareAddress, daycareABI, provider);

    // HTTP provider for on-demand queries
    const httpProvider = new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_HTTP_URL);
    const pollingContract = new ethers.Contract(gameAddress, gameABI, httpProvider);
    const pollingNftContract = new ethers.Contract(nftAddress, nftABI, httpProvider);
    const pollingDaycareContract = new ethers.Contract(daycareAddress, daycareABI, httpProvider);

    // Load data from disk on startup
    loadGamesFromDisk();
    loadResolvedGamesFromDisk();
    loadLeaderboardFromDisk();

    // Fetch NFT image
    async function getNFTImage(tokenId) {
        try {
            let uri = await nftContract.tokenURI(tokenId);
            console.log(`Fetching metadata for token ${tokenId}: ${uri}`);
            if (uri.startsWith('ipfs://')) uri = 'https://gateway.pinata.cloud/ipfs/' + uri.slice(7);
            const response = await fetch(uri);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const metadata = await response.json();
            let image = metadata.image;
            console.log(`Image URL for token ${tokenId}: ${image}`);
            if (image && image.startsWith('ipfs://')) image = 'https://gateway.pinata.cloud/ipfs/' + image.slice(7);
            return image || 'https://via.placeholder.com/64';
        } catch (error) {
            console.error(`Error fetching image for token ${tokenId}:`, error.message);
            return 'https://via.placeholder.com/64';
        }
    }

    // Fetch user daycare data
    async function fetchUserDaycare(account) {
        const accountLower = account.toLowerCase();
        try {
            const points = await daycareContract.getTotalPoints(account);
            const daycares = await daycareContract.getDaycares(account);
            const enhancedDaycares = await Promise.all(daycares.map(async (d, index) => {
                const pending = await daycareContract.getPendingPoints(account, index);
                const image = await getNFTImage(d.tokenId);
                return {
                    tokenId: d.tokenId.toString(),
                    startTime: d.startTime.toString(),
                    claimedPoints: d.claimedPoints.toString(),
                    pending: pending.toString(),
                    image
                };
            }));
            return {
                points: points.toString(),
                daycares: enhancedDaycares
            };
        } catch (error) {
            console.error(`Error fetching daycare for ${accountLower}:`, error);
            return { points: '0', daycares: [] };
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
                        if (game.player2 === ethers.constants.AddressZero) continue;
                        const topic = ethers.utils.id('GameResolved(uint256,address,uint256,uint256)');
                        const filter = {
                            address: gameAddress,
                            topics: [
                                topic,
                                ethers.utils.hexZeroPad(ethers.utils.hexValue(i), 32)
                            ]
                        };
                        const logs = await provider.getLogs(filter);
                        let winner = null;
                        if (logs.length > 0) {
                            const log = logs[0];
                            const event = contract.interface.parseLog(log);
                            winner = event.args.winner.toLowerCase();
                        } else {
                            continue;
                        }
                        const image1 = await getNFTImage(game.tokenId1);
                        const image2 = await getNFTImage(game.tokenId2);
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
                            },
                            createTimestamp: game.createTimestamp.toString(),
                            joinTimestamp: game.joinTimestamp.toString()
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
            return resolvedGames.filter(game => 
                (game.player1 === accountLower || 
                (game.player2 && game.player2 === accountLower)) &&
                !userResolvedGames.has(game.gameId)
            );
        }
    }

    // Event listeners for games
    contract.on('GameCreated', async (gameId, player1, tokenId1) => {
        console.log('GameCreated:', gameId.toString(), 'Player:', player1);
        const game = await contract.getGame(gameId);
        const image = await getNFTImage(tokenId1);
        openGames.push({
            id: gameId.toString(),
            player1: game.player1.toLowerCase(),
            tokenId1: game.tokenId1.toString(),
            image,
            createdAt: new Date(Number(game.createTimestamp) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            createTimestamp: game.createTimestamp.toString()
        });
        saveGamesToDisk();
        io.emit('openGamesUpdate', openGames);
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
            tokenId2: game.tokenId2.toString(),
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
            },
            createTimestamp: game.createTimestamp.toString()
        };
        resolvedGames.push(gameData);
        saveResolvedGamesToDisk();
        openGames = openGames.filter(g => g.id !== gameId.toString()); // Remove from openGames
        const player1Socket = userSessions.get(game.player1.toLowerCase());
        const player2Socket = userSessions.get(player2.toLowerCase());
        if (player1Socket) io.to(player1Socket).emit('gameJoined', gameData);
        if (player2Socket) io.to(player2Socket).emit('gameJoined', gameData);
        io.emit('openGamesUpdate', openGames);
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
        openGames = openGames.filter(g => g.id !== gameId.toString()); // Remove from openGames
        saveResolvedGamesToDisk();
        saveGamesToDisk();
        io.emit('openGamesUpdate', openGames);
    });

    contract.on('GameCanceled', async (gameId) => {
        console.log('GameCanceled:', gameId.toString());
        resolvedGames = resolvedGames.filter(game => game.gameId !== gameId.toString());
        openGames = openGames.filter(g => g.id !== gameId.toString()); // Remove from openGames
        saveResolvedGamesToDisk();
        saveGamesToDisk();
        io.emit('openGamesUpdate', openGames);
    });

    // Event listeners for daycare
    contract.on('Claimed', async (user, amount) => {
        console.log('Claimed:', user.toLowerCase(), 'Amount:', amount.toString());
        const userLower = user.toLowerCase();
        const socketId = userSessions.get(userLower);
        if (socketId) {
            const userData = await fetchUserDaycare(userLower);
            io.to(socketId).emit('userDaycareUpdate', userData);
        }
    });

    contract.on('PointsAdded', async (user, amount) => {
        console.log('PointsAdded:', user.toLowerCase(), 'Amount:', amount.toString());
        const userLower = user.toLowerCase();
        const socketId = userSessions.get(userLower);
        if (socketId) {
            const userData = await fetchUserDaycare(userLower);
            io.to(socketId).emit('userDaycareUpdate', userData);
        }
    });

    contract.on('PointsBurned', async (user, amount) => {
        console.log('PointsBurned:', user.toLowerCase(), 'Amount:', amount.toString());
        const userLower = user.toLowerCase();
        const socketId = userSessions.get(userLower);
        if (socketId) {
            const userData = await fetchUserDaycare(userLower);
            io.to(socketId).emit('userDaycareUpdate', userData);
        }
    });

    contract.on('DroppedOff', async (user, tokenId, startTime) => {
        console.log('DroppedOff:', user.toLowerCase(), 'Token:', tokenId.toString());
        const userLower = user.toLowerCase();
        const socketId = userSessions.get(userLower);
        if (socketId) {
            const userData = await fetchUserDaycare(userLower);
            io.to(socketId).emit('userDaycareUpdate', userData);
        }
    });

    contract.on('PickedUp', async (user, tokenId) => {
        console.log('PickedUp:', user.toLowerCase(), 'Token:', tokenId.toString());
        const userLower = user.toLowerCase();
        const socketId = userSessions.get(userLower);
        if (socketId) {
            const userData = await fetchUserDaycare(userLower);
            io.to(socketId).emit('userDaycareUpdate', userData);
        }
    });

    // Socket.IO event listeners
    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);

        socket.on('registerAddress', ({ address }) => {
            console.log(`Registering address ${address} with socket ${socket.id}`);
            userSessions.set(address.toLowerCase(), socket.id);
            socket.emit('openGamesUpdate', openGames);
        });

        socket.on('fetchResolvedGames', async ({ account }) => {
            const accountLower = account.toLowerCase();
            console.log('Fetching resolved games for account:', accountLower);
            const userGames = await fetchResolvedGamesForAccount(accountLower);
            socket.emit('resolvedGames', userGames);
        });

        socket.on('fetchUserDaycare', async ({ account }) => {
            const accountLower = account.toLowerCase();
            console.log('Fetching user daycare for account:', accountLower);
            const userData = await fetchUserDaycare(accountLower);
            socket.emit('userDaycareUpdate', userData);
        });

        socket.on('resolveGame', async ({ gameId, account }) => {
            const accountLower = account.toLowerCase();
            console.log('Resolving game:', gameId, 'for account:', accountLower);
            let resolvedGame = resolvedGames.find(g => g.gameId === gameId);
            let attempts = 0;
            const maxAttempts = 3;
            const retryDelay = 3000;

            async function tryResolveGame() {
                if (!resolvedGame) {
                    try {
                        const gameIdNum = Number(gameId);
                        const game = await contract.getGame(gameIdNum);
                        if (game.player1.toLowerCase() === accountLower || 
                            (game.player2 && game.player2.toLowerCase() === accountLower)) {
                            if (game.player2 === ethers.constants.AddressZero) {
                                socket.emit('gameResolution', { gameId, error: 'Game not joined' });
                                return;
                            }
                            const topic = ethers.utils.id('GameResolved(uint256,address,uint256,uint256)');
                            const filter = {
                                address: gameAddress,
                                topics: [
                                    topic,
                                    ethers.utils.hexZeroPad(ethers.utils.hexValue(gameIdNum), 32)
                                ]
                            };
                            const logs = await provider.getLogs(filter);
                            let winner = null;
                            if (logs.length > 0) {
                                const log = logs[0];
                                const event = contract.interface.parseLog(log);
                                winner = event.args.winner.toLowerCase();
                            } else if (attempts < maxAttempts) {
                                attempts++;
                                console.log(`Game ${gameId} not resolved yet, retrying (${attempts}/${maxAttempts})...`);
                                setTimeout(tryResolveGame, retryDelay);
                                return;
                            } else {
                                socket.emit('gameResolution', { gameId, error: 'Game not resolved or canceled' });
                                return;
                            }
                            const image1 = await getNFTImage(game.tokenId1);
                            const image2 = await getNFTImage(game.tokenId2);
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
                                },
                                createTimestamp: game.createTimestamp.toString(),
                                joinTimestamp: game.joinTimestamp.toString()
                            };
                            resolvedGames.push(resolvedGame);
                            openGames = openGames.filter(g => g.id !== gameId.toString()); // Remove from openGames
                            saveResolvedGamesToDisk();
                            saveGamesToDisk();
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
                        resolved: true,
                        createTimestamp: resolvedGame.createTimestamp,
                        joinTimestamp: resolvedGame.joinTimestamp
                    });
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
            }

            tryResolveGame();
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
            openGames = openGames.filter(g => g.id !== gameId.toString());
            if (!resolvedGamesByUser[accountLower]) resolvedGamesByUser[accountLower] = [];
            if (!resolvedGamesByUser[accountLower].includes(gameId)) {
                resolvedGamesByUser[accountLower].push(gameId);
                saveResolvedGamesByUser(resolvedGamesByUser);
            }
            saveResolvedGamesToDisk();
            saveGamesToDisk();
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