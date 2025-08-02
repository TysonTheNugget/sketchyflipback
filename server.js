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
        origin: ['https://sketchyflips.vercel.app', 'https://dapps.mymilio.xyz', 'http://localhost:3000'],
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
const daycareABI = [{"inputs":[{"internalType":"address","name":"_nftAddress","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"OwnableInvalidOwner","type":"error"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"OwnableUnauthorizedAccount","type":"error"},{"inputs":[],"name":"ReentrancyGuardReentrantCall","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Claimed","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"startTime","type":"uint256"}],"name":"DroppedOff","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"PickedUp","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"PointsAdded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"PointsBurned","type":"event"},{"anonymous":false,"inputs":[],"name":"PointsEditingLocked","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"}],"name":"UserAdded","type":"event"},{"inputs":[{"internalType":"address","name":"user","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"addPoints","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address[]","name":"users","type":"address[]"},{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"name":"addPointsBatch","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"burnPoints","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256[]","name":"daycareIndices","type":"uint256[]"}],"name":"claimMultiple","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"daycareIndex","type":"uint256"}],"name":"claimPoints","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"daycares","outputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint256","name":"startTime","type":"uint256"},{"internalType":"uint256","name":"claimedPoints","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"dropOff","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256[]","name":"tokenIds","type":"uint256[]"}],"name":"dropOffMultiple","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getDaycares","outputs":[{"components":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint256","name":"startTime","type":"uint256"},{"internalType":"uint256","name":"claimedPoints","type":"uint256"}],"internalType":"struct MymilioDaycare.DaycareInfo[]","name":"","type":"tuple[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"},{"internalType":"uint256","name":"daycareIndex","type":"uint256"}],"name":"getPendingPoints","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getTotalPoints","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"lockPointsEditing","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"nft","outputs":[{"internalType":"contract IERC721","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"daycareIndex","type":"uint256"}],"name":"pickUp","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256[]","name":"daycareIndices","type":"uint256[]"}],"name":"pickUpMultiple","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"points","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"pointsEditingLocked","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"pointsPerDay","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"userAddresses","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}];

// Persistent game storage
let openGames = [];
let resolvedGames = [];
let userSessions = new Map(); // Map<address, socketId>

const dataDir = '/var/data';
const gamesFile = path.join(dataDir, 'games.json');
const resolvedGamesFile = path.join(dataDir, 'resolved_games.json');
const resolvedGamesByUserFile = path.join(dataDir, 'resolved_games_by_user.json');

// Ensure the data folder exists
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Load games from disk
function loadGamesFromDisk() {
    if (fs.existsSync(gamesFile)) {
        try {
            openGames = JSON.parse(fs.readFileSync(gamesFile));
            console.log('✅ Loaded open games from disk:', openGames.length);
        } catch (e) {
            console.error('❌ Error loading open games from disk:', e.message, e.stack);
        }
    }
}

// Save games to disk
function saveGamesToDisk() {
    try {
        fs.writeFileSync(gamesFile, JSON.stringify(openGames, null, 2));
        console.log('✅ Saved open games to disk:', openGames.length);
    } catch (e) {
        console.error('❌ Error saving open games to disk:', e.message, e.stack);
    }
}

// Load resolved games from disk
function loadResolvedGamesFromDisk() {
    if (fs.existsSync(resolvedGamesFile)) {
        try {
            resolvedGames = JSON.parse(fs.readFileSync(resolvedGamesFile));
            console.log('✅ Loaded resolved games from disk:', resolvedGames.length);
        } catch (e) {
            console.error('❌ Error loading resolved games from disk:', e.message, e.stack);
        }
    }
}

// Save resolved games to disk
function saveResolvedGamesToDisk() {
    try {
        fs.writeFileSync(resolvedGamesFile, JSON.stringify(resolvedGames, null, 2));
        console.log('✅ Saved resolved games to disk:', resolvedGames.length);
    } catch (e) {
        console.error('❌ Error saving resolved games to disk:', e.message, e.stack);
    }
}

// Load resolved games by user from disk
function loadResolvedGamesByUser() {
    if (!fs.existsSync(resolvedGamesByUserFile)) return {};
    try {
        return JSON.parse(fs.readFileSync(resolvedGamesByUserFile));
    } catch (e) {
        console.error('❌ Error loading resolved games by user from disk:', e.message, e.stack);
        return {};
    }
}

// Save resolved games by user to disk
function saveResolvedGamesByUser(data) {
    try {
        fs.writeFileSync(resolvedGamesByUserFile, JSON.stringify(data, null, 2));
        console.log('✅ Saved resolved games by user to disk:', Object.keys(data).length);
    } catch (e) {
        console.error('❌ Error saving resolved games by user to disk:', e.message, e.stack);
    }
}

let resolvedGamesByUser = loadResolvedGamesByUser();

async function setupProvider() {
    let provider;
    try {
        provider = new ethers.providers.WebSocketProvider(process.env.ALCHEMY_WSS_URL);
        provider.on('error', (error) => {
            console.error('WebSocket error:', error.message, error.stack);
            setTimeout(setupProvider, 5000);
        });
        provider.on('close', (code, reason) => {
            console.log(`WebSocket closed with code ${code}, reason: ${reason || 'unknown'}`);
            setTimeout(setupProvider, 5000);
        });
    } catch (error) {
        console.error('Provider setup error:', error.message, error.stack);
        setTimeout(setupProvider, 5000);
        return null;
    }
    return provider;
}

async function initializeContract() {
    const provider = await setupProvider();
    if (!provider) {
        console.error('Provider initialization failed, cannot proceed');
        return;
    }

    const contract = new ethers.Contract(gameAddress, gameABI, provider);
    const nftContract = new ethers.Contract(nftAddress, nftABI, provider);
    const daycareContract = new ethers.Contract(daycareAddress, daycareABI, provider);

    // HTTP fallback for polling
    const httpProvider = new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_HTTP_URL);
    const pollingContract = new ethers.Contract(gameAddress, gameABI, httpProvider);
    const pollingNftContract = new ethers.Contract(nftAddress, nftABI, httpProvider);
    const pollingDaycareContract = new ethers.Contract(daycareAddress, daycareABI, httpProvider);

    // Load data from disk on startup
    loadGamesFromDisk();
    loadResolvedGamesFromDisk();

    // Fetch open games
    async function fetchOpenGames() {
        try {
            const openIds = await pollingContract.getOpenGames();
            console.log('👉 Fetched openIds:', openIds.map(i => i.toString()));
            const openIdsSet = new Set(openIds.map(id => id.toString()));
            // Check for games that were open but are now closed
            const closedGames = openGames.filter(game => !openIdsSet.has(game.id));
            for (const game of closedGames) {
                console.log(`Game ${game.id} no longer open, checking resolution for player: ${game.player1}`);
                const userGames = await fetchResolvedGamesForAccount(game.player1);
                const socketId = userSessions.get(game.player1);
                if (socketId) {
                    console.log(`Emitting resolved games to ${game.player1}:`, userGames.length);
                    io.to(socketId).emit('resolvedGames', userGames);
                }
                if (game.player2) {
                    const userGames2 = await fetchResolvedGamesForAccount(game.player2);
                    const socketId2 = userSessions.get(game.player2);
                    if (socketId2) {
                        console.log(`Emitting resolved games to ${game.player2}:`, userGames2.length);
                        io.to(socketId2).emit('resolvedGames', userGames2);
                    }
                }
            }
            openGames = [];
            for (let id of openIds) {
                try {
                    const game = await pollingContract.getGame(id);
                    const image = `https://f005.backblazeb2.com/file/sketchymilios/${game.tokenId1}.png`;
                    openGames.push({
                        id: id.toString(),
                        player1: game.player1.toLowerCase(),
                        tokenId1: game.tokenId1.toString(),
                        image,
                        createdAt: new Date(Number(game.createTimestamp) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        createTimestamp: game.createTimestamp.toString()
                    });
                } catch (error) {
                    console.error(`Error fetching game ${id}:`, error.message, error.stack);
                }
            }
            console.log('Broadcasting open games:', openGames.length);
            io.emit('openGamesUpdate', openGames);
            saveGamesToDisk();
        } catch (error) {
            console.error('Error in fetchOpenGames:', error.message, error.stack);
        }
    }

    // Fetch resolved games for an account
    async function fetchResolvedGamesForAccount(accountLower) {
        console.log(`Fetching resolved games for ${accountLower}`);
        try {
            let newResolvedGames = [];
            for (let i = 0; i < 10000; i++) { // Increased range to catch more games
                try {
                    const game = await pollingContract.getGame(i);
                    if (!game.active &&
                        (game.player1.toLowerCase() === accountLower ||
                         (game.player2 && game.player2.toLowerCase() === accountLower))) {
                        if (game.player2 === ethers.constants.AddressZero) {
                            console.log(`Game ${i} not joined, skipping`);
                            continue; // Not joined, skip
                        }
                        const topic = ethers.utils.id('GameResolved(uint256,address,uint256,uint256)');
                        const filter = {
                            address: gameAddress,
                            topics: [
                                topic,
                                ethers.utils.hexZeroPad(ethers.utils.hexValue(i), 32)
                            ]
                        };
                        const logs = await httpProvider.getLogs(filter);
                        let winner = null;
                        if (logs.length > 0) {
                            const log = logs[0];
                            const event = contract.interface.parseLog(log);
                            winner = event.args.winner.toLowerCase();
                        } else {
                            console.log(`No GameResolved event for game ${i}, checking if canceled`);
                            const cancelTopic = ethers.utils.id('GameCanceled(uint256)');
                            const cancelFilter = {
                                address: gameAddress,
                                topics: [
                                    cancelTopic,
                                    ethers.utils.hexZeroPad(ethers.utils.hexValue(i), 32)
                                ]
                            };
                            const cancelLogs = await httpProvider.getLogs(cancelFilter);
                            if (cancelLogs.length > 0) {
                                console.log(`Game ${i} was canceled, skipping`);
                                continue;
                            }
                            console.log(`Game ${i} not resolved or canceled, skipping`);
                            continue;
                        }
                        const image1 = await getNFTImage(game.tokenId1);
                        const image2 = await getNFTImage(game.tokenId2);
                        const gameData = {
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
                                [game.player1.toLowerCase()]: resolvedGamesByUser[game.player1.toLowerCase()]?.includes(i.toString()) || false,
                                [game.player2 ? game.player2.toLowerCase() : '']: resolvedGamesByUser[game.player2?.toLowerCase()]?.includes(i.toString()) || false
                            },
                            viewed: {
                                [game.player1.toLowerCase()]: resolvedGamesByUser[game.player1.toLowerCase()]?.includes(i.toString()) || false,
                                [game.player2 ? game.player2.toLowerCase() : '']: resolvedGamesByUser[game.player2?.toLowerCase()]?.includes(i.toString()) || false
                            },
                            createTimestamp: game.createTimestamp.toString(),
                            joinTimestamp: game.joinTimestamp.toString()
                        };
                        if (!resolvedGames.some(g => g.gameId === i.toString())) {
                            console.log(`Adding new resolved game ${i} for ${accountLower}`);
                            newResolvedGames.push(gameData);
                        } else {
                            console.log(`Game ${i} already in resolvedGames, updating`);
                            newResolvedGames.push(gameData);
                        }
                    }
                } catch (e) {
                    if (e.message.includes('revert') || e.message.includes('out of bounds')) {
                        console.log(`Reached end of games at index ${i}`);
                        break;
                    }
                    console.error(`Error fetching game ${i}:`, e.message, e.stack);
                }
            }
            // Update resolvedGames, avoiding duplicates
            resolvedGames = resolvedGames.filter(game => 
                !(game.player1 === accountLower || (game.player2 && game.player2 === accountLower)) ||
                newResolvedGames.some(newGame => newGame.gameId === game.gameId)
            );
            resolvedGames = [...resolvedGames, ...newResolvedGames.filter(newGame => 
                !resolvedGames.some(existing => existing.gameId === newGame.gameId)
            )];
            saveResolvedGamesToDisk();
            const userResolvedGames = new Set(resolvedGamesByUser[accountLower] || []);
            const filteredGames = resolvedGames.filter(game =>
                (game.player1 === accountLower ||
                (game.player2 && game.player2 === accountLower)) &&
                !userResolvedGames.has(game.gameId)
            );
            console.log(`Returning ${filteredGames.length} resolved games for ${accountLower}`);
            return filteredGames;
        } catch (error) {
            console.error('Error fetching resolved games for', accountLower, ':', error.message, error.stack);
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
            return `https://f005.backblazeb2.com/file/sketchymilios/${tokenId}.png`;
        } catch (error) {
            console.error(`Error fetching NFT image for token ${tokenId}:`, error.message, error.stack);
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
            console.log(`Fetched daycare data for ${accountLower}: ${enhancedDaycares.length} daycares`);
            return {
                points: points.toString(),
                daycares: enhancedDaycares
            };
        } catch (error) {
            console.error(`Error fetching daycare for ${accountLower}:`, error.message, error.stack);
            return { points: '0', daycares: [] };
        }
    }

    // Event listeners for games
    contract.on('GameCreated', async (gameId, player1, tokenId1) => {
        console.log('GameCreated:', gameId.toString(), 'Player:', player1.toLowerCase());
        await fetchOpenGames();
    });

    contract.on('GameJoined', async (gameId, player2, tokenId2) => {
        console.log('GameJoined:', gameId.toString(), 'Player:', player2.toLowerCase());
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
        const player1Socket = userSessions.get(game.player1.toLowerCase());
        const player2Socket = userSessions.get(player2.toLowerCase());
        if (player1Socket) {
            console.log(`Emitting gameJoined to ${game.player1.toLowerCase()}`);
            io.to(player1Socket).emit('gameJoined', gameData);
        }
        if (player2Socket) {
            console.log(`Emitting gameJoined to ${player2.toLowerCase()}`);
            io.to(player2Socket).emit('gameJoined', gameData);
        }
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
        const player1 = resolvedGames.find(g => g.gameId === gameId.toString())?.player1;
        const player2 = resolvedGames.find(g => g.gameId === gameId.toString())?.player2;
        if (player1) {
            const socketId1 = userSessions.get(player1);
            if (socketId1) {
                const userGames = await fetchResolvedGamesForAccount(player1);
                console.log(`Emitting resolved games to ${player1}:`, userGames.length);
                io.to(socketId1).emit('resolvedGames', userGames);
            }
        }
        if (player2) {
            const socketId2 = userSessions.get(player2);
            if (socketId2) {
                const userGames = await fetchResolvedGamesForAccount(player2);
                console.log(`Emitting resolved games to ${player2}:`, userGames.length);
                io.to(socketId2).emit('resolvedGames', userGames);
            }
        }
        await fetchOpenGames();
    });

    contract.on('GameCanceled', async (gameId) => {
        console.log('GameCanceled:', gameId.toString());
        resolvedGames = resolvedGames.filter(game => game.gameId !== gameId.toString());
        saveResolvedGamesToDisk();
        await fetchOpenGames();
    });

    // Event listeners for daycare
    daycareContract.on('Claimed', async (user, amount) => {
        console.log('Claimed:', user.toLowerCase(), 'Amount:', amount.toString());
        const userLower = user.toLowerCase();
        const socketId = userSessions.get(userLower);
        if (socketId) {
            const userData = await fetchUserDaycare(userLower);
            io.to(socketId).emit('userDaycareUpdate', userData);
        }
    });

    daycareContract.on('PointsAdded', async (user, amount) => {
        console.log('PointsAdded:', user.toLowerCase(), 'Amount:', amount.toString());
        const userLower = user.toLowerCase();
        const socketId = userSessions.get(userLower);
        if (socketId) {
            const userData = await fetchUserDaycare(userLower);
            io.to(socketId).emit('userDaycareUpdate', userData);
        }
    });

    daycareContract.on('PointsBurned', async (user, amount) => {
        console.log('PointsBurned:', user.toLowerCase(), 'Amount:', amount.toString());
        const userLower = user.toLowerCase();
        const socketId = userSessions.get(userLower);
        if (socketId) {
            const userData = await fetchUserDaycare(userLower);
            io.to(socketId).emit('userDaycareUpdate', userData);
        }
    });

    daycareContract.on('DroppedOff', async (user, tokenId, startTime) => {
        console.log('DroppedOff:', user.toLowerCase(), 'Token:', tokenId.toString());
        const userLower = user.toLowerCase();
        const socketId = userSessions.get(userLower);
        if (socketId) {
            const userData = await fetchUserDaycare(userLower);
            io.to(socketId).emit('userDaycareUpdate', userData);
        }
    });

    daycareContract.on('PickedUp', async (user, tokenId) => {
        console.log('PickedUp:', user.toLowerCase(), 'Token:', tokenId.toString());
        const userLower = user.toLowerCase();
        const socketId = userSessions.get(userLower);
        if (socketId) {
            const userData = await fetchUserDaycare(userLower);
            io.to(socketId).emit('userDaycareUpdate', userData);
        }
    });

    // Initial fetch
    await fetchOpenGames();

    // Periodically fetch open games
    setInterval(async () => {
        console.log('Periodic fetch of open games');
        await fetchOpenGames();
    }, 10000);

    // Periodically fetch resolved games for all connected users
    setInterval(async () => {
        console.log('Periodic fetch of resolved games for all users:', userSessions.size);
        for (let address of userSessions.keys()) {
            const userGames = await fetchResolvedGamesForAccount(address);
            const socketId = userSessions.get(address);
            if (socketId) {
                console.log(`Emitting resolved games to ${address}: ${userGames.length} games`);
                io.to(socketId).emit('resolvedGames', userGames);
            }
        }
    }, 10000); // Set to 10 seconds for faster updates

    // Socket.IO event listeners
    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);
        socket.on('registerAddress', async ({ address }) => {
            console.log(`Registering address ${address} with socket ${socket.id}`);
            userSessions.set(address.toLowerCase(), socket.id);
            socket.emit('openGamesUpdate', openGames);
            const userGames = await fetchResolvedGamesForAccount(address.toLowerCase());
            console.log(`Initial resolved games for ${address}:`, userGames.length);
            socket.emit('resolvedGames', userGames);
        });
        socket.emit('openGamesUpdate', openGames);
        setTimeout(() => {
            socket.emit('openGamesUpdate', openGames);
        }, 3000);
        socket.on('fetchResolvedGames', async ({ account }) => {
            const accountLower = account.toLowerCase();
            console.log('Fetching resolved games for account:', accountLower);
            const userGames = await fetchResolvedGamesForAccount(accountLower);
            console.log(`Emitting resolved games to ${accountLower}:`, userGames.length);
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
            if (!resolvedGame) {
                try {
                    const gameIdNum = Number(gameId);
                    const game = await contract.getGame(gameIdNum);
                    if (game.player1.toLowerCase() === accountLower ||
                        (game.player2 && game.player2.toLowerCase() === accountLower)) {
                        if (game.player2 === ethers.constants.AddressZero) {
                            console.log(`Game ${gameId} not joined, emitting error`);
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
                        } else {
                            console.log(`Game ${gameId} not resolved or canceled, checking cancellation`);
                            const cancelTopic = ethers.utils.id('GameCanceled(uint256)');
                            const cancelFilter = {
                                address: gameAddress,
                                topics: [
                                    cancelTopic,
                                    ethers.utils.hexZeroPad(ethers.utils.hexValue(gameIdNum), 32)
                                ]
                            };
                            const cancelLogs = await provider.getLogs(cancelFilter);
                            if (cancelLogs.length > 0) {
                                console.log(`Game ${gameId} was canceled, emitting error`);
                                socket.emit('gameResolution', { gameId, error: 'Game was canceled' });
                                return;
                            }
                            console.log(`Game ${gameId} not resolved, emitting error`);
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
                                [game.player1.toLowerCase()]: resolvedGamesByUser[game.player1.toLowerCase()]?.includes(gameId) || false,
                                [game.player2 ? game.player2.toLowerCase() : '']: resolvedGamesByUser[game.player2?.toLowerCase()]?.includes(gameId) || false
                            },
                            viewed: {
                                [game.player1.toLowerCase()]: resolvedGamesByUser[game.player1.toLowerCase()]?.includes(gameId) || false,
                                [game.player2 ? game.player2.toLowerCase() : '']: resolvedGamesByUser[game.player2?.toLowerCase()]?.includes(gameId) || false
                            },
                            createTimestamp: game.createTimestamp.toString(),
                            joinTimestamp: game.joinTimestamp.toString()
                        };
                        resolvedGames = resolvedGames.filter(g => g.gameId !== gameId);
                        resolvedGames.push(resolvedGame);
                        saveResolvedGamesToDisk();
                    } else {
                        console.log(`Game ${gameId} not found or user ${accountLower} not a player`);
                        socket.emit('gameResolution', { gameId, error: 'Game not found or user not a player' });
                        return;
                    }
                } catch (error) {
                    console.error(`Error fetching game ${gameId} from contract:`, error.message, error.stack);
                    socket.emit('gameResolution', { gameId, error: 'Game not found' });
                    return;
                }
            }
            resolvedGame.viewed[accountLower] = true;
            resolvedGame.userResolved[accountLower] = true;
            saveResolvedGamesToDisk();
            if (!resolvedGamesByUser[accountLower]) resolvedGamesByUser[accountLower] = [];
            if (!resolvedGamesByUser[accountLower].includes(gameId)) {
                resolvedGamesByUser[accountLower].push(gameId);
                saveResolvedGamesByUser(resolvedGamesByUser);
            }
            if (resolvedGame.resolved && resolvedGame.winner) {
                console.log(`Emitting gameResolution for game ${gameId} to ${accountLower}`);
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
                console.log(`Emitting updated resolved games to ${accountLower}:`, userGames.length);
                socket.emit('resolvedGames', userGames);
            } else {
                console.log(`Game ${gameId} not resolved or no winner, emitting error`);
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
            console.log(`Emitting updated resolved games after markGameResolved to ${accountLower}:`, userGames.length);
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
            console.log(`Emitting updated resolved games after removeGame to ${accountLower}:`, userGames.length);
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
                      },
                      userResolved: {
                        ...game.userResolved,
                        [accountLower]: true
                      }
                    }
                  : game
            );
            if (!resolvedGamesByUser[accountLower]) resolvedGamesByUser[accountLower] = [];
            gameIds.forEach(gameId => {
                if (!resolvedGamesByUser[accountLower].includes(gameId)) {
                    resolvedGamesByUser[accountLower].push(gameId);
                }
            });
            saveResolvedGamesByUser(resolvedGamesByUser);
            saveResolvedGamesToDisk();
            const userResolvedGames = new Set(resolvedGamesByUser[accountLower] || []);
            const userGames = resolvedGames.filter(game =>
                (game.player1 === accountLower ||
                (game.player2 && game.player2 === accountLower)) &&
                !userResolvedGames.has(game.gameId)
            );
            console.log(`Emitting updated resolved games after markGamesViewed to ${accountLower}:`, userGames.length);
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