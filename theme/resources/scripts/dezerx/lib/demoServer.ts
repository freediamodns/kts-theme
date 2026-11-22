import { Websocket } from '@/plugins/Websocket';
import type { ServerStats } from '@/api/server/getServerResourceUsage';


const MB = 1024 * 1024;

export interface DemoServerShape {
    uuid: string;
    port: number;
    limits: { memory: number; cpu: number; disk: number };
    quiet?: boolean;
}

function seed(uuid: string, salt: number): number {
    let hash = 2166136261 ^ salt;

    for (let index = 0; index < uuid.length; index++) {
        hash = Math.imul(hash ^ uuid.charCodeAt(index), 16777619);
    }

    return ((hash >>> 0) % 10000) / 10000;
}

const between = (low: number, high: number) => low + Math.random() * (high - low);

const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high);

const under = (limit: number, fallback: number, share: number) => (limit > 0 ? limit * share : fallback);

const stamp = (date = new Date()) =>
    [date.getHours(), date.getMinutes(), date.getSeconds()].map((part) => String(part).padStart(2, '0')).join(':');

const info = (text: string) => `[${stamp()} INFO]: ${text}`;

const warn = (text: string) => `\u001b[33m[${stamp()} WARN]: ${text}\u001b[0m`;

const daemon = (text: string) => `\u001b[33m\u001b[1m[KTS Host]:\u001b[39m ${text}`;

const PLAYERS = ['Steve', 'Alex', 'Notch_Fan', 'CreeperHugger', 'xX_Builder_Xx', 'Redstoner42', 'Pixelmancer'];

const VERSION = '1.21.4';

const PAPER = `Paper version ${VERSION}-232-main@7a1d4c2 (2025-06-12T09:41:18Z) (Implementing API version ${VERSION}-R0.1-SNAPSHOT)`;

export function demoResourceUsage(shape: DemoServerShape, suspended: boolean): ServerStats {
    const now = Date.now() / 1000;
    const wave = (salt: number, period: number) => 0.5 + 0.5 * Math.sin(now / period + seed(shape.uuid, salt) * 6.28);

    const memoryCap = under(shape.limits.memory, 4096, 0.85);
    const cpuCap = under(shape.limits.cpu, 200, 0.6);

    return {
        status: suspended ? 'offline' : 'running',
        isSuspended: suspended,
        memoryUsageInBytes: suspended ? 0 : Math.round(memoryCap * (0.35 + 0.35 * wave(1, 90)) * MB),
        cpuUsagePercent: suspended ? 0 : Number((cpuCap * (0.08 + 0.3 * wave(2, 23))).toFixed(2)),
        diskUsageInBytes: Math.round(under(shape.limits.disk, 20480, 0.5) * (0.15 + 0.4 * seed(shape.uuid, 3)) * MB),
        networkRxInBytes: Math.round((now % 86400) * 40_000 * (0.5 + seed(shape.uuid, 4))),
        networkTxInBytes: Math.round((now % 86400) * 25_000 * (0.5 + seed(shape.uuid, 5))),
        uptime: suspended ? 0 : Math.round((3 + 20 * seed(shape.uuid, 6)) * 3600 * 1000 + (now % 3600) * 1000),
    };
}

type Entry = { event: 'console output' | 'daemon message'; line: string };

export class DemoSocket extends Websocket {
    private history: Entry[] = [];
    private timers: ReturnType<typeof setTimeout>[] = [];
    private state: 'offline' | 'starting' | 'running' | 'stopping' = 'offline';
    private startedAt = 0;
    private online: string[] = [];

    private memoryMb = 0;
    private cpu = 0;
    private rx = 0;
    private tx = 0;
    private readonly diskMb: number;

    constructor(private readonly shape: DemoServerShape) {
        super();

        this.diskMb = under(shape.limits.disk, 20480, 0.5) * (0.15 + 0.4 * seed(shape.uuid, 3));
    }

    connect(): this {
        this.later(0, () => {
            this.emit('SOCKET_OPEN');
            this.emit('auth success');
            this.boot();
        });

        this.every(2000, () => this.emitStats());

        return this;
    }

    setToken(): this {
        return this;
    }

    authenticate() {}

    open() {}

    reconnect() {}

    close() {
        this.timers.forEach((timer) => clearTimeout(timer));
        this.timers = [];
        this.removeAllListeners();
    }

    send(event: string, payload?: string | string[]) {
        const argument = Array.isArray(payload) ? payload[0] : payload;

        switch (event) {
            case 'send logs':
                this.history.forEach((entry) => this.emit(entry.event, entry.line));
                break;
            case 'send stats':
                this.emitStats();
                break;
            case 'send command':
                this.command(String(argument ?? '').trim());
                break;
            case 'set state':
                this.power(String(argument ?? ''));
                break;
        }
    }

    private later(delay: number, run: () => void) {
        this.timers.push(setTimeout(run, delay));
    }

    private every(interval: number, run: () => void) {
        const tick = () => {
            run();
            this.later(interval, tick);
        };

        this.later(interval, tick);
    }

    private print(line: string, event: Entry['event'] = 'console output') {
        if (this.shape.quiet) {
            return;
        }

        this.history.push({ event, line });
        this.history = this.history.slice(-400);
        this.emit(event, line);
    }

    private status(state: DemoSocket['state']) {
        this.state = state;
        this.emit('status', state);
    }

    private play(lines: [number, () => string, Entry['event']?][], done?: () => void) {
        let at = 0;

        for (const [pause, line, event] of lines) {
            at += pause;
            this.later(at, () => this.print(line(), event));
        }

        if (done) {
            this.later(at + 60, done);
        }
    }

    private boot() {
        this.status('starting');
        this.startedAt = Date.now();

        const port = this.shape.port || 25565;
        const memory = this.shape.limits.memory > 0 ? `${this.shape.limits.memory}M` : '4096M';

        this.play(
            [
                [80, () => daemon('Checking server disk space usage, this could take a few seconds...')],
                [240, () => daemon('Updating process configuration files...')],
                [160, () => daemon('Ensuring file permissions are set correctly, this could take a few seconds...')],
                [300, () => 'java -version', 'daemon message'],
                [220, () => 'openjdk version "21.0.5" 2024-10-15 LTS'],
                [10, () => 'OpenJDK Runtime Environment Temurin-21.0.5+11 (build 21.0.5+11-LTS)'],
                [10, () => 'OpenJDK 64-Bit Server VM Temurin-21.0.5+11 (build 21.0.5+11-LTS, mixed mode, sharing)'],
                [
                    160,
                    () => `java -Xms128M -Xmx${memory} -Dterminal.jline=false -Dterminal.ansi=true -jar server.jar`,
                    'daemon message',
                ],
                [420, () => 'Starting org.bukkit.craftbukkit.Main'],
                [
                    380,
                    () =>
                        info(
                            '[bootstrap] Running Java 21 (OpenJDK 64-Bit Server VM 21.0.5+11-LTS; Eclipse Adoptium Temurin-21.0.5+11) on Linux 6.1.0-51-amd64 (amd64)'
                        ),
                ],
                [
                    40,
                    () =>
                        info(
                            `[bootstrap] Loading Paper ${VERSION}-232-main@7a1d4c2 (2025-06-12T09:41:18Z) for Minecraft ${VERSION}`
                        ),
                ],
                [260, () => info('[PluginInitializerManager] Initializing plugins...')],
                [90, () => info('[PluginInitializerManager] Initialized 3 plugins')],
                [20, () => info('[PluginInitializerManager] Bukkit plugins (3):')],
                [10, () => info(' - EssentialsX (2.21.0), LuckPerms (5.4.141), WorldEdit (7.3.9)')],
                [
                    620,
                    () =>
                        info(
                            'Environment: Environment[sessionHost=https://sessionserver.mojang.com, servicesHost=https://api.minecraftservices.com, name=PROD]'
                        ),
                ],
                [300, () => info('Loaded 1370 recipes')],
                [40, () => info('Loaded 1481 advancements')],
                [140, () => info(`Starting minecraft server version ${VERSION}`)],
                [30, () => info('Loading properties')],
                [30, () => info(`This server is running ${PAPER}`)],
                [30, () => info('Server Ping Player Sample Count: 12')],
                [20, () => info('Using 4 threads for Netty based IO')],
                [
                    160,
                    () =>
                        warn(
                            '[!] The timings profiler has been enabled but has been scheduled for removal from Paper in the future.'
                        ),
                ],
                [60, () => info('Default game type: SURVIVAL')],
                [30, () => info('Generating keypair')],
                [60, () => info(`Starting Minecraft server on 0.0.0.0:${port}`)],
                [30, () => info('Using epoll channel type')],
                [20, () => info('Paper: Using libdeflate (Linux x86_64) compression from Velocity.')],
                [20, () => info('Paper: Using OpenSSL 3.x.x (Linux x86_64) cipher from Velocity.')],
                [180, () => info('[LuckPerms] Loading server plugin LuckPerms v5.4.141')],
                [60, () => info('[WorldEdit] Loading server plugin WorldEdit v7.3.9')],
                [60, () => info('[Essentials] Loading server plugin Essentials v2.21.0')],
                [120, () => info('Server permissions file permissions.yml is empty, ignoring it')],
                [140, () => info('Preparing level "world"')],
                [320, () => info('Preparing start region for dimension minecraft:overworld')],
                [180, () => info('Preparing spawn area: 0%')],
                [260, () => info('Preparing spawn area: 51%')],
                [220, () => info('Time elapsed: 1384 ms')],
                [80, () => info('Preparing start region for dimension minecraft:the_nether')],
                [160, () => info('Time elapsed: 402 ms')],
                [60, () => info('Preparing start region for dimension minecraft:the_end')],
                [140, () => info('Time elapsed: 311 ms')],
                [120, () => info('[LuckPerms] Enabling LuckPerms v5.4.141')],
                [90, () => info('[WorldEdit] Enabling WorldEdit v7.3.9')],
                [70, () => info('[Essentials] Enabling Essentials v2.21.0')],
                [110, () => info('Running delayed init tasks')],
                [80, () => info(`Done (${((Date.now() - this.startedAt) / 1000).toFixed(3)}s)! For help, type "help"`)],
                [30, () => info('Timings Reset')],
            ],
            () => {
                this.status('running');
                this.ambient();
            }
        );
    }

    private ambient() {
        const next = () =>
            this.later(between(18_000, 45_000), () => {
                if (this.state !== 'running') {
                    return;
                }

                const away = PLAYERS.filter((name) => !this.online.includes(name));
                const leaving = this.online.length > 0 && (away.length === 0 || Math.random() < 0.4);

                if (leaving) {
                    const name = this.online[Math.floor(Math.random() * this.online.length)]!;

                    this.online = this.online.filter((one) => one !== name);
                    this.print(info(`${name} lost connection: Disconnected`));
                    this.print(info(`\u001b[33m${name} left the game\u001b[0m`));
                } else if (away.length > 0) {
                    const name = away[Math.floor(Math.random() * away.length)]!;
                    const ip = `${Math.floor(between(11, 223))}.${Math.floor(between(0, 255))}.${Math.floor(
                        between(0, 255)
                    )}.${Math.floor(between(1, 254))}`;

                    this.online.push(name);
                    this.print(
                        info(
                            `UUID of player ${name} is ${
                                crypto.randomUUID?.() ?? '00000000-0000-0000-0000-000000000000'
                            }`
                        )
                    );
                    this.print(
                        info(
                            `${name}[/${ip}:${Math.floor(between(40000, 65000))}] logged in with entity id ${Math.floor(
                                between(100, 9000)
                            )} at ([world]${Math.floor(between(-300, 300))}.5, 64.0, ${Math.floor(
                                between(-300, 300)
                            )}.5)`
                        )
                    );
                    this.print(info(`\u001b[33m${name} joined the game\u001b[0m`));
                }

                next();
            });

        next();
    }

    private command(typed: string) {
        if (typed === '') {
            return;
        }

        const [name = '', ...rest] = typed.replace(/^\//, '').split(/\s+/);
        const text = rest.join(' ');

        if (this.state !== 'running') {
            return;
        }

        switch (name.toLowerCase()) {
            case 'help':
            case '?':
                [
                    '--------- Help: Index (1/12) --------------------',
                    'Use /help [n] to get page n of help.',
                    'Aliases: Lists command aliases',
                    'Bukkit: All commands for Bukkit',
                    'Essentials: All commands for Essentials',
                    'LuckPerms: All commands for LuckPerms',
                    'Minecraft: All commands for Minecraft',
                    'WorldEdit: All commands for WorldEdit',
                ].forEach((line) => this.print(info(line)));
                break;
            case 'list':
                this.print(
                    info(
                        `There are ${this.online.length} of a max of 20 players online: ${this.online.join(
                            ', '
                        )}`.trimEnd()
                    )
                );
                break;
            case 'say':
                this.print(info(`[Server] ${text}`));
                break;
            case 'tps':
                this.print(info(`TPS from last 1m, 5m, 15m: 20.0, 20.0, ${between(19.8, 20).toFixed(1)}`));
                break;
            case 'version':
            case 'ver':
                this.print(info(`This server is running ${PAPER}`));
                this.print(info('You are running the latest version'));
                break;
            case 'plugins':
            case 'pl':
                this.print(info('Server Plugins (3):'));
                this.print(info('Bukkit Plugins:'));
                this.print(info(' - Essentials, LuckPerms, WorldEdit'));
                break;
            case 'save-all':
                this.print(info('Saving the game (this may take a moment!)'));
                this.later(700, () => this.print(info('Saved the game')));
                break;
            case 'stop':
            case 'restart':
                this.power(name.toLowerCase());
                break;
            default:
                this.print(info('Unknown or incomplete command, see below for error'));
                this.print(info(`\u001b[31m${typed}\u001b[4m<--[HERE]\u001b[0m`));
        }
    }

    private power(signal: string) {
        const stop = (then?: () => void) => {
            if (this.state === 'offline') {
                then?.();

                return;
            }

            this.status('stopping');
            this.play(
                [
                    [60, () => info('Stopping the server')],
                    [80, () => info('Stopping server')],
                    [120, () => info('[Essentials] Disabling Essentials v2.21.0')],
                    [80, () => info('[WorldEdit] Disabling WorldEdit v7.3.9')],
                    [80, () => info('[LuckPerms] Disabling LuckPerms v5.4.141')],
                    [160, () => info('Saving players')],
                    [120, () => info('Saving worlds')],
                    [240, () => info("Saving chunks for level 'ServerLevel[world]'/minecraft:overworld")],
                    [200, () => info('ThreadedAnvilChunkStorage (world): All chunks are saved')],
                    [160, () => info('Flushing Chunk IO')],
                    [120, () => info('Closing Thread Pool')],
                    [100, () => info('Closing Server')],
                ],
                () => {
                    this.online = [];
                    this.status('offline');
                    then?.();
                }
            );
        };

        switch (signal) {
            case 'start':
                if (this.state === 'offline') {
                    this.boot();
                }
                break;
            case 'stop':
                stop();
                break;
            case 'restart':
                stop(() => this.later(600, () => this.boot()));
                break;
            case 'kill':
                this.online = [];
                this.status('offline');
                break;
        }
    }

    private emitStats() {
        const booting = this.state === 'starting';
        const live = this.state === 'running' || booting;

        const memoryCap = under(this.shape.limits.memory, 4096, 0.85);
        const cpuCap = under(this.shape.limits.cpu, 200, 0.9);

        if (!live) {
            this.memoryMb = 0;
            this.cpu = 0;
        } else if (booting) {
            this.memoryMb = clamp(this.memoryMb + between(90, 260), 180, memoryCap * 0.7);
            this.cpu = clamp(cpuCap * between(0.55, 0.95), 0, cpuCap);
        } else {
            const settle = memoryCap * 0.55;

            this.memoryMb = clamp(this.memoryMb + between(-60, 60) + (settle - this.memoryMb) * 0.08, 200, memoryCap);
            this.cpu = clamp(
                this.cpu * 0.6 + cpuCap * between(0.04, 0.3) * 0.4 + (this.online.length * cpuCap) / 60,
                0.5,
                cpuCap
            );
        }

        if (live) {
            this.rx += Math.round(between(8_000, 60_000) * (1 + this.online.length));
            this.tx += Math.round(between(15_000, 110_000) * (1 + this.online.length));
        }

        this.emit(
            'stats',
            JSON.stringify({
                memory_bytes: Math.round(this.memoryMb * MB),
                memory_limit_bytes: Math.round((this.shape.limits.memory || 4096) * MB),
                cpu_absolute: Number(this.cpu.toFixed(3)),
                network: { rx_bytes: this.rx, tx_bytes: this.tx },
                state: this.state,
                uptime: live ? Date.now() - this.startedAt : 0,
                disk_bytes: Math.round(this.diskMb * MB),
            })
        );
    }
}
