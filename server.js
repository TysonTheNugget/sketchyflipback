const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const ethers = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();

// CORS for HTTP and Socket.io handshake
app.use(cors({
    origin: ['https://sketchyflips.vercel.app', 'http://localhost:3000'],
    credentials: true
}));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ['https://sketchyflips.vercel.app', 'http://localhost:3000'],
        methods: ['GET', 'POST']
    }
});

// ---- CONTRACT ADDRESSES/ABIs ----
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

// --- PASTE YOUR FULL DAYCARE ABI BELOW ---
const daycareAddress = '0xd32247484111569930a0b9c7e669e8E108392496';
const daycareABI = [{"inputs":[{"internalType":"address","name":"_nftAddress","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"OwnableInvalidOwner","type":"error"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"OwnableUnauthorizedAccount","type":"error"},{"inputs":[],"name":"ReentrancyGuardReentrantCall","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Claimed","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"startTime","type":"uint256"}],"name":"DroppedOff","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"PickedUp","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"PointsAdded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"PointsBurned","type":"event"},{"anonymous":false,"inputs":[],"name":"PointsEditingLocked","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"}],"name":"UserAdded","type":"event"},{"inputs":[{"internalType":"address","name":"user","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"addPoints","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address[]","name":"users","type":"address[]"},{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"name":"addPointsBatch","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"burnPoints","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256[]","name":"daycareIndices","type":"uint256[]"}],"name":"claimMultiple","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"daycareIndex","type":"uint256"}],"name":"claimPoints","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"daycares","outputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint256","name":"startTime","type":"uint256"},{"internalType":"uint256","name":"claimedPoints","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"dropOff","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256[]","name":"tokenIds","type":"uint256[]"}],"name":"dropOffMultiple","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getDaycares","outputs":[{"components":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint256","name":"startTime","type":"uint256"},{"internalType":"uint256","name":"claimedPoints","type":"uint256"}],"internalType":"struct MymilioDaycare.DaycareInfo[]","name":"","type":"tuple[]"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getLeaderboard","outputs":[{"internalType":"address[]","name":"","type":"address[]"},{"internalType":"uint256[]","name":"","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"},{"internalType":"uint256","name":"daycareIndex","type":"uint256"}],"name":"getPendingPoints","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getTotalPoints","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"lockPointsEditing","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"nft","outputs":[{"internalType":"contract IERC721","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"daycareIndex","type":"uint256"}],"name":"pickUp","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256[]","name":"daycareIndices","type":"uint256[]"}],"name":"pickUpMultiple","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"points","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"pointsEditingLocked","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"pointsPerDay","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"userAddresses","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}];
    /* PASTE FULL ABI HERE */
];

// ---- DATA STORAGE & HELPERS ----
let openGames = [];
let resolvedGames = [];
let userSessions = new Map();

const dataDir = '/var/data';
const gamesFile = path.join(dataDir, 'games.json');
const resolvedGamesFile = path.join(dataDir, 'resolved_games.json');
const resolvedGamesByUserFile = path.join(dataDir, 'resolved_games_by_user.json');
let leaderboard = [];
const leaderboardFile = path.join(dataDir, 'leaderboard.json');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

function loadGamesFromDisk() {
    if (fs.existsSync(gamesFile)) {
        try { openGames = JSON.parse(fs.readFileSync(gamesFile)); }
        catch (e) { console.error('❌ Error loading open games:', e); }
    }
}
function saveGamesToDisk() {
    try { fs.writeFileSync(gamesFile, JSON.stringify(openGames, null, 2)); }
    catch (e) { console.error('❌ Error saving open games:', e); }
}
function loadResolvedGamesFromDisk() {
    if (fs.existsSync(resolvedGamesFile)) {
        try { resolvedGames = JSON.parse(fs.readFileSync(resolvedGamesFile)); }
        catch (e) { console.error('❌ Error loading resolved games:', e); }
    }
}
function saveResolvedGamesToDisk() {
    try { fs.writeFileSync(resolvedGamesFile, JSON.stringify(resolvedGames, null, 2)); }
    catch (e) { console.error('❌ Error saving resolved games:', e); }
}
function loadResolvedGamesByUser() {
    if (!fs.existsSync(resolvedGamesByUserFile)) return {};
    try { return JSON.parse(fs.readFileSync(resolvedGamesByUserFile)); }
    catch (e) { console.error('❌ Error loading resolvedGamesByUser:', e); return {}; }
}
function saveResolvedGamesByUser(data) {
    try { fs.writeFileSync(resolvedGamesByUserFile, JSON.stringify(data, null, 2)); }
    catch (e) { console.error('❌ Error saving resolvedGamesByUser:', e); }
}
function loadLeaderboardFromDisk() {
    if (fs.existsSync(leaderboardFile)) {
        try { leaderboard = JSON.parse(fs.readFileSync(leaderboardFile)); }
        catch (e) { console.error('❌ Error loading leaderboard:', e); }
    }
}
function saveLeaderboardToDisk() {
    try { fs.writeFileSync(leaderboardFile, JSON.stringify(leaderboard, null, 2)); }
    catch (e) { console.error('❌ Error saving leaderboard:', e); }
}
let resolvedGamesByUser = loadResolvedGamesByUser();

function removeOpenGame(gameId) {
    const before = openGames.length;
    openGames = openGames.filter(g => g.id !== gameId && g.gameId !== gameId);
    if (before !== openGames.length) {
        saveGamesToDisk();
        io.emit('openGamesUpdate', openGames);
    }
}

async function getNFTImage(tokenId, nftContract) {
    try {
        let uri = await nftContract.tokenURI(tokenId);
        if (uri.startsWith('ipfs://')) uri = 'https://gateway.pinata.cloud/ipfs/' + uri.slice(7);
        const response = await fetch(uri);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const metadata = await response.json();
        let image = metadata.image;
        if (image && image.startsWith('ipfs://')) image = 'https://gateway.pinata.cloud/ipfs/' + image.slice(7);
        return image || 'https://via.placeholder.com/64';
    } catch (error) {
        console.error(`Error fetching image for token ${tokenId}:`, error.message);
        return 'https://via.placeholder.com/64';
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

async function fetchUserDaycare(account, daycareContract, nftContract) {
    const accountLower = account.toLowerCase();
    try {
        const points = await daycareContract.getTotalPoints(account);
        const daycares = await daycareContract.getDaycares(account);
        const enhancedDaycares = await Promise.all(daycares.map(async (d, index) => {
            const pending = await daycareContract.getPendingPoints(account, index);
            const image = await getNFTImage(d.tokenId, nftContract);
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

async function initializeContract() {
    const provider = await setupProvider();
    if (!provider) return;
    const contract = new ethers.Contract(gameAddress, gameABI, provider);
    const nftContract = new ethers.Contract(nftAddress, nftABI, provider);
    const daycareContract = new ethers.Contract(daycareAddress, daycareABI, provider);

    const httpProvider = new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_HTTP_URL);
    const pollingContract = new ethers.Contract(gameAddress, gameABI, httpProvider);
    const pollingNftContract = new ethers.Contract(nftAddress, nftABI, httpProvider);

    loadGamesFromDisk();
    loadResolvedGamesFromDisk();
    loadLeaderboardFromDisk();

    // ---- GAME EVENTS ----
    contract.on('GameCreated', async (gameId, player1, tokenId1) => {
        let image = await getNFTImage(tokenId1, nftContract);
        const openGame = {
            id: gameId.toString(),
            player1: player1.toLowerCase(),
            tokenId1: tokenId1.toString(),
            image,
            createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            createTimestamp: Math.floor(Date.now()/1000).toString()
        };
        openGames.push(openGame);
        saveGamesToDisk();
        io.emit('openGamesUpdate', openGames);
    });

    contract.on('GameJoined', async (gameId, player2, tokenId2) => {
        removeOpenGame(gameId.toString());
        const game = await contract.getGame(gameId);
        const image1 = await getNFTImage(game.tokenId1, nftContract);
        const image2 = await getNFTImage(tokenId2, nftContract);
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
        io.emit('openGamesUpdate', openGames);
    });

    contract.on('GameResolved', async (gameId, winner, tokenId1, tokenId2) => {
        removeOpenGame(gameId.toString());
        const image1 = await getNFTImage(tokenId1, nftContract);
        const image2 = await getNFTImage(tokenId2, nftContract);
        resolvedGames = resolvedGames.map(game =>
            game.gameId === gameId.toString()
                ? {
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
                }
                : game
        );
        saveResolvedGamesToDisk();
        io.emit('openGamesUpdate', openGames);
    });

    contract.on('GameCanceled', async (gameId) => {
        removeOpenGame(gameId.toString());
        resolvedGames = resolvedGames.filter(game => game.gameId !== gameId.toString());
        saveResolvedGamesToDisk();
        io.emit('openGamesUpdate', openGames);
    });

    // ---- DAYCARE EVENTS (OPTIONAL) ----
    daycareContract.on('Claimed', async (user, amount) => {});
    daycareContract.on('PointsAdded', async (user, amount) => {});
    daycareContract.on('PointsBurned', async (user, amount) => {});
    daycareContract.on('DroppedOff', async (user, tokenId, startTime) => {});
    daycareContract.on('PickedUp', async (user, tokenId) => {});

    // ---- SOCKET.IO ----
    io.on('connection', (socket) => {
        socket.on('registerAddress', ({ address }) => {
            userSessions.set(address.toLowerCase(), socket.id);
            socket.emit('openGamesUpdate', openGames);
            socket.emit('leaderboardUpdate', leaderboard);
        });

        socket.emit('openGamesUpdate', openGames);

        socket.on('fetchResolvedGames', async ({ account }) => {
            const accountLower = account.toLowerCase();
            const userResolvedGames = new Set(resolvedGamesByUser[accountLower] || []);
            const userGames = resolvedGames.filter(game =>
                (game.player1 === accountLower ||
                    (game.player2 && game.player2 === accountLower)) &&
                !userResolvedGames.has(game.gameId)
            );
            socket.emit('resolvedGames', userGames);
        });

        socket.on('fetchUserDaycare', async ({ account }) => {
            const accountLower = account.toLowerCase();
            const userData = await fetchUserDaycare(accountLower, daycareContract, nftContract);
            socket.emit('userDaycareUpdate', userData);
        });

        socket.on('resolveGame', async ({ gameId, account }) => {
            const accountLower = account.toLowerCase();
            let resolvedGame = resolvedGames.find(g => g.gameId === gameId);
            if (!resolvedGame) {
                try {
                    const gameIdNum = Number(gameId);
                    const game = await pollingContract.getGame(gameIdNum);
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
                        const logs = await pollingContract.provider.getLogs(filter);
                        let winner = null;
                        if (logs.length > 0) {
                            const log = logs[0];
                            const event = contract.interface.parseLog(log);
                            winner = event.args.winner.toLowerCase();
                        } else {
                            socket.emit('gameResolution', { gameId, error: 'Game not resolved or canceled' });
                            return;
                        }
                        const image1 = await getNFTImage(game.tokenId1, pollingNftContract);
                        const image2 = await getNFTImage(game.tokenId2, pollingNftContract);
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
        });

        socket.on('markGameResolved', ({ gameId, account }) => {
            const accountLower = account.toLowerCase();
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
            for (let [address, socketId] of userSessions.entries()) {
                if (socketId === socket.id) {
                    userSessions.delete(address);
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
