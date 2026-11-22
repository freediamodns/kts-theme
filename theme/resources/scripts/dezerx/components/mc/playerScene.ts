import {
    BoxGeometry,
    CanvasTexture,
    CustomBlending,
    DoubleSide,
    Float32BufferAttribute,
    Group,
    LinearFilter,
    Matrix3,
    Mesh,
    MeshStandardMaterial,
    NearestFilter,
    OneFactor,
    Plane,
    Raycaster,
    RepeatWrapping,
    ShaderMaterial,
    TextureLoader,
    Vector2,
    Vector3,
    ZeroFactor,
} from 'three';
import type { BufferGeometry, Material, Object3D, Texture } from 'three';
import { FunctionAnimation, SkinViewer } from 'skinview3d';
import type { PlayerObject } from 'skinview3d';

const ROOT = '/dezerx/mc/armor';

const GLINT = `${ROOT}/glint.webp`;

const WINGS = `${ROOT}/wings/elytra.webp`;

const TRIMS = `${ROOT}/trims`;

const DEFAULT_SKIN = '/dezerx/mc/skin/steve.png';

const UNDYED_LEATHER = 0xa06540;

const PIECE = /^(?:minecraft:)?([a-z0-9_]+?)_(helmet|chestplate|leggings|boots)$/;

const ELYTRA = /^(?:minecraft:)?elytra$/;

const PUMPKIN = /^(?:minecraft:)?carved_pumpkin$/;

const MATERIALS: Record<string, string> = {
    golden: 'gold',
    turtle: 'turtle_scute',
};

export type ArmorSlot = 'head' | 'chest' | 'legs' | 'feet';

const SLOT_OF: Record<string, ArmorSlot> = {
    helmet: 'head',
    chestplate: 'chest',
    leggings: 'legs',
    boots: 'feet',
};

export interface Trim {
    material: string;
    pattern: string;
}

export interface WornItem {
    id: string;
    color?: number | null;
    enchanted: boolean;
    trim?: Trim | null;
    skull?: string | null;
}

export type Equipment = Partial<Record<ArmorSlot, WornItem>>;

type Part = 'head' | 'body' | 'rightArm' | 'leftArm' | 'rightLeg' | 'leftLeg';

type Vec3 = [number, number, number];

interface Cube {
    part: Part;
    uv: [number, number];
    size: Vec3;
    grow: number;
    at: Vec3;
    mirror?: boolean;
}

const OUTER = 1;
const INNER = 0.5;
const LEG = -0.1;

const CUBES: Record<ArmorSlot, Cube[]> = {
    head: [
        { part: 'head', uv: [0, 0], size: [8, 8, 8], grow: OUTER, at: [0, 4, 0] },
        { part: 'head', uv: [32, 0], size: [8, 8, 8], grow: OUTER + 0.5, at: [0, 4, 0] },
    ],
    chest: [
        { part: 'body', uv: [16, 16], size: [8, 12, 4], grow: OUTER, at: [0, 0, 0] },
        { part: 'rightArm', uv: [40, 16], size: [4, 12, 4], grow: OUTER, at: [-1, -4, 0] },
        { part: 'leftArm', uv: [40, 16], size: [4, 12, 4], grow: OUTER, at: [1, -4, 0], mirror: true },
    ],
    legs: [
        { part: 'body', uv: [16, 16], size: [8, 12, 4], grow: INNER, at: [0, 0, 0] },
        { part: 'rightLeg', uv: [0, 16], size: [4, 12, 4], grow: INNER + LEG, at: [0, -6, 0] },
        { part: 'leftLeg', uv: [0, 16], size: [4, 12, 4], grow: INNER + LEG, at: [0, -6, 0], mirror: true },
    ],
    feet: [
        { part: 'rightLeg', uv: [0, 16], size: [4, 12, 4], grow: OUTER + LEG, at: [0, -6, 0] },
        { part: 'leftLeg', uv: [0, 16], size: [4, 12, 4], grow: OUTER + LEG, at: [0, -6, 0], mirror: true },
    ],
};

interface ModelBox {
    uv: [number, number];
    from: Vec3;
    size: Vec3;
    grow?: number;
    mirror?: boolean;
    pivot?: Vec3;
    turn?: number;
}

interface Skull {
    url?: string;
    texture?: [number, number];
    origin?: Vec3;
    scale?: number;
    boxes: ModelBox[];
}

const HEAD: ModelBox = { uv: [0, 0], from: [-4, -8, -4], size: [8, 8, 8] };

const HAT: ModelBox = { uv: [32, 0], from: [-4, -8, -4], size: [8, 8, 8], grow: 0.25 };

const SKULLS: Record<string, Skull> = {
    skeleton_skull: { url: `${ROOT}/heads/skeleton.webp`, boxes: [HEAD] },
    wither_skeleton_skull: { url: `${ROOT}/heads/wither_skeleton.webp`, boxes: [HEAD] },
    creeper_head: { url: `${ROOT}/heads/creeper.webp`, boxes: [HEAD] },
    zombie_head: { url: `${ROOT}/heads/zombie.webp`, boxes: [HEAD, HAT] },
    player_head: { boxes: [HEAD, HAT] },
    piglin_head: {
        url: `${ROOT}/heads/piglin.webp`,
        boxes: [
            { uv: [0, 0], from: [-5, -8, -4], size: [10, 8, 8] },
            { uv: [31, 1], from: [-2, -4, -5], size: [4, 4, 1] },
            { uv: [2, 4], from: [2, -2, -5], size: [1, 2, 1] },
            { uv: [2, 0], from: [-3, -2, -5], size: [1, 2, 1] },
            { uv: [51, 6], from: [0, 0, -2], size: [1, 5, 4], pivot: [4.5, -6, 0], turn: -Math.PI / 6 },
            { uv: [39, 6], from: [-1, 0, -2], size: [1, 5, 4], pivot: [-4.5, -6, 0], turn: Math.PI / 6 },
        ],
    },
    dragon_head: {
        url: `${ROOT}/heads/dragon.webp`,
        texture: [256, 256],
        origin: [0, -7.986666, 0],
        scale: 0.75,
        boxes: [
            { uv: [176, 44], from: [-6, -1, -24], size: [12, 5, 16] },
            { uv: [112, 30], from: [-8, -8, -10], size: [16, 16, 16] },
            { uv: [0, 0], from: [-5, -12, -4], size: [2, 4, 6], mirror: true },
            { uv: [112, 0], from: [-5, -3, -22], size: [2, 2, 4], mirror: true },
            { uv: [0, 0], from: [3, -12, -4], size: [2, 4, 6] },
            { uv: [112, 0], from: [3, -3, -22], size: [2, 2, 4] },
            { uv: [176, 65], from: [-6, 4, -24], size: [12, 4, 16] },
        ],
    },
};

const SKULL_SCALE = 1.1875;

const STANDING_TOP = 17;
const TALL: Record<string, number> = { dragon_head: 28.5 };
const FEET = -17;
const ZOOM = 0.85;

const BLOCK_ON_HEAD = 10;

const CAPE_ANGLE = (10.8 * Math.PI) / 180;

const ours = ([x, y, z]: Vec3): Vec3 => [x, -y, -z];

const bare = (id: string): string => id.replace(/^minecraft:/, '');

function unwrap(
    box: BoxGeometry,
    [u, v]: [number, number],
    [w, h, d]: Vec3,
    [width, height]: [number, number] = [64, 32]
): void {
    const rect = (x1: number, y1: number, x2: number, y2: number, flip = false): number[] => {
        const left = x1 / width;
        const right = x2 / width;
        const top = 1 - y1 / height;
        const bottom = 1 - y2 / height;

        return flip
            ? [left, bottom, right, bottom, left, top, right, top]
            : [left, top, right, top, left, bottom, right, bottom];
    };

    box.setAttribute(
        'uv',
        new Float32BufferAttribute(
            [
                ...rect(u + w + d, v + d, u + w + 2 * d, v + d + h),
                ...rect(u, v + d, u + d, v + d + h),
                ...rect(u + d, v, u + d + w, v + d),
                ...rect(u + d + w, v, u + d + 2 * w, v + d, true),
                ...rect(u + d, v + d, u + d + w, v + d + h),
                ...rect(u + 2 * d + w, v + d, u + 2 * d + 2 * w, v + d + h),
            ],
            2
        )
    );
}

interface Layer {
    url: string;
    tint: number | null;
}

interface Piece {
    slot: ArmorSlot;
    item: WornItem;
    asset: string;
    layers: Layer[];
}

function pieceOf(slot: ArmorSlot, item: WornItem): Piece | null {
    const match = PIECE.exec(item.id);

    if (!match || SLOT_OF[match[2]!] !== slot) {
        return null;
    }

    const asset = MATERIALS[match[1]!] ?? match[1]!;
    const folder = `${ROOT}/${slot === 'legs' ? 'humanoid_leggings' : 'humanoid'}`;

    const layers =
        asset === 'leather'
            ? [
                  { url: `${folder}/leather.webp`, tint: item.color ?? UNDYED_LEATHER },
                  { url: `${folder}/leather_overlay.webp`, tint: null },
              ]
            : [{ url: `${folder}/${asset}.webp`, tint: null }];

    return { slot, item, asset, layers };
}

function pixels(image: HTMLImageElement): ImageData {
    const canvas = document.createElement('canvas');

    canvas.width = image.width;
    canvas.height = image.height;

    const context = canvas.getContext('2d', { willReadFrequently: true })!;

    context.drawImage(image, 0, 0);

    return context.getImageData(0, 0, canvas.width, canvas.height);
}

function recolour(pattern: HTMLImageElement, key: HTMLImageElement, palette: HTMLImageElement): Texture {
    const from = pixels(key).data;
    const to = pixels(palette).data;
    const lookup = new Map<number, number>();

    for (let at = 0; at < from.length && at < to.length; at += 4) {
        lookup.set((from[at]! << 16) | (from[at + 1]! << 8) | from[at + 2]!, at);
    }

    const canvas = document.createElement('canvas');

    canvas.width = pattern.width;
    canvas.height = pattern.height;

    const context = canvas.getContext('2d', { willReadFrequently: true })!;

    context.drawImage(pattern, 0, 0);

    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = image.data;

    for (let at = 0; at < data.length; at += 4) {
        if (data[at + 3] === 0) {
            continue;
        }

        const index = lookup.get((data[at]! << 16) | (data[at + 1]! << 8) | data[at + 2]!);

        if (index !== undefined) {
            data[at] = to[index]!;
            data[at + 1] = to[index + 1]!;
            data[at + 2] = to[index + 2]!;
        }
    }

    context.putImageData(image, 0, 0);

    const texture = new CanvasTexture(canvas);

    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    texture.generateMipmaps = false;

    return texture;
}

function headSkin(image: HTMLImageElement): Texture {
    const canvas = document.createElement('canvas');

    canvas.width = image.width;
    canvas.height = image.height;

    const context = canvas.getContext('2d', { willReadFrequently: true })!;
    const unit = image.width / 64;

    context.drawImage(image, 0, 0);

    const face = context.getImageData(0, 0, 32 * unit, 16 * unit);

    for (let at = 3; at < face.data.length; at += 4) {
        face.data[at] = 255;
    }

    context.putImageData(face, 0, 0);

    if (image.width === image.height * 2) {
        const hat = context.getImageData(32 * unit, 0, 32 * unit, 32 * unit).data;
        let clear = false;

        for (let at = 3; at < hat.length && !clear; at += 4) {
            clear = hat[at]! < 128;
        }

        if (!clear) {
            context.clearRect(32 * unit, 0, 32 * unit, 16 * unit);
        }
    }

    const texture = new CanvasTexture(canvas);

    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    texture.generateMipmaps = false;

    return texture;
}

function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();

        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = url;
    });
}

const GLINT_VERTEX = `
uniform mat3 glintMatrix;
varying vec2 vUv;
varying vec2 vGlint;

void main() {
    vUv = uv;
    vGlint = (glintMatrix * vec3(uv.x, 1.0 - uv.y, 1.0)).xy;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
}
`;

const GLINT_FRAGMENT = `
uniform sampler2D map;
uniform sampler2D glint;
varying vec2 vUv;
varying vec2 vGlint;

void main() {
    if (texture2D(map, vUv).a < 0.1) discard;
    gl_FragColor = vec4(texture2D(glint, vec2(vGlint.x, 1.0 - vGlint.y)).rgb, 1.0);
}
`;

const GLINT_TURN = Math.PI / 18;

const GLINT_SCALE = 0.16;

function glintAt(matrix: Matrix3, millis: number): void {
    const ticks = millis * 4;
    const u = (ticks % 110000) / 110000;
    const v = (ticks % 30000) / 30000;
    const c = Math.cos(GLINT_TURN) * GLINT_SCALE;
    const s = Math.sin(GLINT_TURN) * GLINT_SCALE;

    matrix.set(c, -s, -u, s, c, v, 0, 0, 1);
}

const HEAD_YAW = 1.1;
const HEAD_PITCH = 0.55;

const BEHIND = 2;

const LOOK_DEPTH = 20;

const EYE = new Vector3(0, 12, 0);

export interface PlayerScene {
    readonly canvas: HTMLCanvasElement;
    setSkin(image: Blob, slim: boolean | null): Promise<void>;
    setCape(image: Blob | null): Promise<void>;
    setEquipment(equipment: Equipment): Promise<void>;
    setSize(width: number, height: number): void;
    setActive(active: boolean): void;
    dispose(): void;
}

class Model implements PlayerScene {
    readonly canvas: HTMLCanvasElement;

    private readonly viewer: SkinViewer;
    private readonly loader = new TextureLoader();
    private readonly textures = new Map<string, Promise<Texture | null>>();
    private readonly worn: Object3D[] = [];
    private readonly geometries: BufferGeometry[] = [];
    private readonly materials: Material[] = [];
    private readonly back: Object3D[] = [];
    private readonly backMaterials: Material[] = [];
    private readonly glint = { value: new Matrix3() };
    private readonly still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    private readonly raycaster = new Raycaster();
    private readonly plane = new Plane();
    private readonly pointerNdc = new Vector2();
    private readonly hit = new Vector3();
    private readonly toward = new Vector3();

    private pointer: { x: number; y: number } | null = null;
    private dragging = false;
    private headYaw = 0;
    private headPitch = 0;
    private clock = 0;
    private generation = 0;
    private disposed = false;

    private top = STANDING_TOP;
    private readonly target = new Vector3();

    private cape: HTMLImageElement | null = null;
    private elytra: WornItem | null = null;
    private wings: Texture | null = null;
    private shine: Texture | null = null;

    constructor(width: number, height: number) {
        this.canvas = document.createElement('canvas');

        this.viewer = new SkinViewer({
            canvas: this.canvas,
            width,
            height,
            fov: 30,
            zoom: ZOOM,
            renderPaused: true,
            animation: new FunctionAnimation((player, _progress, delta) => this.pose(player, delta)),
        });

        const controls = this.viewer.controls;

        controls.enableZoom = false;
        controls.enablePan = false;
        controls.enableDamping = true;
        controls.dampingFactor = 0.12;
        controls.rotateSpeed = 0.9;
        controls.minPolarAngle = Math.PI / 2 - 0.45;
        controls.maxPolarAngle = Math.PI / 2 + 0.45;

        glintAt(this.glint.value, 0);

        window.addEventListener('pointermove', this.onPointer, { passive: true });
        window.addEventListener('pointerup', this.onRelease, { passive: true });
        window.addEventListener('pointercancel', this.onRelease, { passive: true });
        this.canvas.addEventListener('pointerdown', this.onGrab, { passive: true });
    }

    private onPointer = (event: PointerEvent) => {
        this.pointer = { x: event.clientX, y: event.clientY };
    };

    private onGrab = (event: PointerEvent) => {
        this.onPointer(event);
        this.dragging = true;
    };

    private onRelease = () => {
        this.dragging = false;
    };

    async setSkin(image: Blob, slim: boolean | null): Promise<void> {
        const url = URL.createObjectURL(image);

        try {
            await this.viewer.loadSkin(url, { model: slim === null ? 'auto-detect' : slim ? 'slim' : 'default' });
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    async setCape(image: Blob | null): Promise<void> {
        let cape: HTMLImageElement | null = null;

        if (image) {
            const url = URL.createObjectURL(image);

            try {
                cape = await loadImage(url);
            } catch {
                cape = null;
            } finally {
                URL.revokeObjectURL(url);
            }
        }

        if (this.disposed) {
            return;
        }

        this.cape = cape;
        this.dressBack();
    }

    async setEquipment(equipment: Equipment): Promise<void> {
        const generation = ++this.generation;

        const pieces: Piece[] = [];

        for (const slot of Object.keys(CUBES) as ArmorSlot[]) {
            const item = equipment[slot];
            const piece = item ? pieceOf(slot, item) : null;

            if (piece) {
                pieces.push(piece);
            }
        }

        const head = equipment.head;
        const skull = head ? SKULLS[bare(head.id)] : undefined;
        const pumpkin = head !== undefined && PUMPKIN.test(head.id);
        const elytra = equipment.chest && ELYTRA.test(equipment.chest.id) ? equipment.chest : null;
        const shiny = pieces.some((piece) => piece.item.enchanted) || elytra?.enchanted === true;

        const [loaded, skullTexture, faces, wings, glint] = await Promise.all([
            Promise.all(
                pieces.map(async (piece) => ({
                    ...piece,
                    textures: await Promise.all(piece.layers.map((layer) => this.texture(layer.url))),
                    trim: piece.item.trim ? await this.trim(piece, piece.item.trim) : null,
                }))
            ),
            skull && head ? this.skullTexture(skull, head) : Promise.resolve(null),
            pumpkin
                ? Promise.all(['front', 'side', 'top'].map((face) => this.texture(`${ROOT}/pumpkin/${face}.webp`)))
                : Promise.resolve(null),
            elytra ? this.texture(WINGS) : Promise.resolve(null),
            shiny ? this.texture(GLINT, true) : Promise.resolve(null),
        ]);

        if (generation !== this.generation || this.disposed) {
            return;
        }

        this.strip();

        for (const piece of loaded) {
            const geometries = CUBES[piece.slot].map((cube) => {
                const geometry = this.keep(
                    new BoxGeometry(
                        cube.size[0] + cube.grow * 2,
                        cube.size[1] + cube.grow * 2,
                        cube.size[2] + cube.grow * 2
                    )
                );

                unwrap(geometry, cube.uv, cube.size);

                return geometry;
            });

            piece.layers.forEach((layer, index) => {
                const texture = piece.textures[index];

                if (!texture) {
                    return;
                }

                const material = this.track(
                    new MeshStandardMaterial({
                        map: texture,
                        color: layer.tint ?? 0xffffff,
                        side: DoubleSide,
                        alphaTest: 0.1,
                    })
                );

                const shine =
                    index === 0 && piece.item.enchanted && glint
                        ? this.track(this.glintMaterial(texture, glint))
                        : null;

                CUBES[piece.slot].forEach((cube, at) => {
                    this.wear(cube, new Mesh(geometries[at]!, material), index + 1);

                    if (shine) {
                        this.wear(cube, new Mesh(geometries[at]!, shine), 10);
                    }
                });
            });

            if (piece.trim) {
                const material = this.track(
                    new MeshStandardMaterial({ map: piece.trim, side: DoubleSide, alphaTest: 0.1 })
                );

                CUBES[piece.slot].forEach((cube, at) => this.wear(cube, new Mesh(geometries[at]!, material), 5));
            }
        }

        if (skull && skullTexture) {
            this.wearSkull(skull, skullTexture);
        }

        if (faces && faces[0] && faces[1] && faces[2]) {
            this.wearPumpkin(faces[0], faces[1], faces[2]);
        }

        this.elytra = elytra;
        this.wings = wings;
        this.shine = glint;
        this.dressBack();
        this.frame(head ? TALL[bare(head.id)] ?? STANDING_TOP : STANDING_TOP);
    }

    private frame(top: number): void {
        if (top === this.top) {
            return;
        }

        this.top = top;

        const centre = Math.max(0, (top + FEET) / 2);
        const reach = Math.max(STANDING_TOP - FEET, top - FEET) / (STANDING_TOP - FEET);
        const distance = 4.5 + 16.5 / Math.tan((this.viewer.fov * Math.PI) / 360) / (ZOOM / reach);

        this.target.set(0, centre, 0);
        this.viewer.controls.target.copy(this.target);
        this.viewer.camera.position.set(0, centre, distance);
        this.viewer.controls.update();
    }

    setSize(width: number, height: number): void {
        this.viewer.setSize(width, height);
    }

    setActive(active: boolean): void {
        this.viewer.renderPaused = !active;
    }

    dispose(): void {
        this.disposed = true;

        window.removeEventListener('pointermove', this.onPointer);
        window.removeEventListener('pointerup', this.onRelease);
        window.removeEventListener('pointercancel', this.onRelease);
        this.canvas.removeEventListener('pointerdown', this.onGrab);

        this.strip();
        this.undressBack();

        for (const pending of this.textures.values()) {
            void pending.then((texture) => texture?.dispose());
        }

        this.viewer.dispose();
        this.canvas.remove();
    }

    private texture(url: string, repeat = false): Promise<Texture | null> {
        let pending = this.textures.get(url);

        if (!pending) {
            pending = this.loader
                .loadAsync(url)
                .then((texture) => {
                    if (repeat) {
                        texture.wrapS = RepeatWrapping;
                        texture.wrapT = RepeatWrapping;
                        texture.magFilter = LinearFilter;
                        texture.minFilter = LinearFilter;
                    } else {
                        texture.magFilter = NearestFilter;
                        texture.minFilter = NearestFilter;
                    }

                    texture.generateMipmaps = false;

                    return texture;
                })
                .catch(() => null);

            this.textures.set(url, pending);
        }

        return pending;
    }

    private async trim(piece: Piece, trim: Trim): Promise<Texture | null> {
        const layer = piece.slot === 'legs' ? 'humanoid_leggings' : 'humanoid';
        const palettes = piece.asset === trim.material ? [`${trim.material}_darker`, trim.material] : [trim.material];

        for (const palette of palettes) {
            const texture = await this.recoloured(layer, trim.pattern, palette);

            if (texture) {
                return texture;
            }
        }

        return null;
    }

    private recoloured(layer: string, pattern: string, palette: string): Promise<Texture | null> {
        const key = `trim:${layer}:${pattern}:${palette}`;
        let pending = this.textures.get(key);

        if (!pending) {
            pending = Promise.all([
                this.texture(`${TRIMS}/${layer}/${pattern}.webp`),
                this.texture(`${TRIMS}/palettes/key.webp`),
                this.texture(`${TRIMS}/palettes/${palette}.webp`),
            ]).then(([mask, from, to]) => (mask && from && to ? recolour(mask.image, from.image, to.image) : null));

            this.textures.set(key, pending);
        }

        return pending;
    }

    private async skullTexture(skull: Skull, item: WornItem): Promise<Texture | null> {
        if (skull.url) {
            return this.texture(skull.url);
        }

        return (item.skull ? await this.headSkin(item.skull) : null) ?? this.headSkin(DEFAULT_SKIN);
    }

    private headSkin(url: string): Promise<Texture | null> {
        const key = `head:${url}`;
        let pending = this.textures.get(key);

        if (!pending) {
            pending = this.texture(url).then((texture) => (texture ? headSkin(texture.image) : null));
            this.textures.set(key, pending);
        }

        return pending;
    }

    private glintMaterial(map: Texture, glint: Texture): ShaderMaterial {
        return new ShaderMaterial({
            uniforms: { map: { value: map }, glint: { value: glint }, glintMatrix: this.glint },
            vertexShader: GLINT_VERTEX,
            fragmentShader: GLINT_FRAGMENT,
            side: DoubleSide,
            transparent: true,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1,
            blending: CustomBlending,
            blendSrc: OneFactor,
            blendDst: OneFactor,
            blendSrcAlpha: ZeroFactor,
            blendDstAlpha: OneFactor,
        });
    }

    private track<T extends Material>(material: T): T {
        this.materials.push(material);

        return material;
    }

    private keep<T extends BufferGeometry>(geometry: T): T {
        this.geometries.push(geometry);

        return geometry;
    }

    private wear(cube: Cube, mesh: Mesh, order: number): void {
        mesh.position.set(...cube.at);
        mesh.renderOrder = order;

        if (cube.mirror) {
            mesh.scale.x = -1;
        }

        this.viewer.playerObject.skin[cube.part].add(mesh);
        this.worn.push(mesh);
    }

    private wearSkull(skull: Skull, texture: Texture): void {
        const image = texture.image as HTMLImageElement;
        const size = skull.texture ?? ([64, (64 * image.height) / image.width] as [number, number]);
        const material = this.track(new MeshStandardMaterial({ map: texture, side: DoubleSide, alphaTest: 0.1 }));

        const root = new Group();
        const model = new Group();

        root.scale.setScalar(SKULL_SCALE);
        model.position.set(...ours(skull.origin ?? [0, 0, 0]));
        model.scale.setScalar(skull.scale ?? 1);
        root.add(model);

        for (const box of skull.boxes) {
            model.add(this.box(box, size, material));
        }

        this.viewer.playerObject.skin.head.add(root);
        this.worn.push(root);
    }

    private box(box: ModelBox, texture: [number, number], material: Material): Object3D {
        const [w, h, d] = box.size;
        const grow = (box.grow ?? 0) * 2;
        const geometry = this.keep(new BoxGeometry(w + grow, h + grow, d + grow));

        unwrap(geometry, box.uv, box.size, texture);

        const mesh = new Mesh(geometry, material);

        mesh.position.set(...ours([box.from[0] + w / 2, box.from[1] + h / 2, box.from[2] + d / 2]));

        if (box.mirror) {
            mesh.scale.x = -1;
        }

        if (!box.pivot) {
            return mesh;
        }

        const pivot = new Group();

        pivot.position.set(...ours(box.pivot));
        pivot.rotation.z = -(box.turn ?? 0);
        pivot.add(mesh);

        return pivot;
    }

    private wearPumpkin(front: Texture, side: Texture, top: Texture): void {
        const [carved, rind, cap] = [front, side, top].map((map) => this.track(new MeshStandardMaterial({ map })));
        const geometry = this.keep(new BoxGeometry(BLOCK_ON_HEAD, BLOCK_ON_HEAD, BLOCK_ON_HEAD));
        const mesh = new Mesh(geometry, [rind!, rind!, cap!, cap!, carved!, rind!]);

        mesh.position.set(0, 4, 0);
        this.viewer.playerObject.skin.head.add(mesh);
        this.worn.push(mesh);
    }

    private dressBack(): void {
        this.undressBack();

        const source = this.elytra ? this.cape ?? (this.wings?.image as HTMLImageElement | undefined) : this.cape;

        if (!source) {
            this.viewer.resetCape();

            return;
        }

        this.viewer.loadCape(source, { backEquipment: this.elytra ? 'elytra' : 'cape' });

        const { leftWing, rightWing, map } = this.viewer.playerObject.elytra;

        if (!this.elytra?.enchanted || !this.shine || !map) {
            return;
        }

        const material = this.glintMaterial(map, this.shine);

        this.backMaterials.push(material);

        for (const wing of [leftWing, rightWing]) {
            const surface = wing.children[0] as Mesh;
            const mesh = new Mesh(surface.geometry, material);

            mesh.position.copy(surface.position);
            mesh.scale.copy(surface.scale);
            mesh.renderOrder = 10;
            wing.add(mesh);
            this.back.push(mesh);
        }
    }

    private undressBack(): void {
        for (const object of this.back) {
            object.removeFromParent();
        }

        for (const material of this.backMaterials) {
            material.dispose();
        }

        this.back.length = 0;
        this.backMaterials.length = 0;
    }

    private strip(): void {
        for (const object of this.worn) {
            object.removeFromParent();
        }

        for (const geometry of this.geometries) {
            geometry.dispose();
        }

        for (const material of this.materials) {
            material.dispose();
        }

        this.worn.length = 0;
        this.geometries.length = 0;
        this.materials.length = 0;
    }

    private pose(player: PlayerObject, delta: number): void {
        this.clock += delta;

        const [yaw, pitch] = this.dragging ? [0, 0] : this.lookAt();
        const ease = 1 - Math.exp(-delta * 9);

        this.headYaw += (yaw - this.headYaw) * ease;
        this.headPitch += (pitch - this.headPitch) * ease;

        player.rotation.y = this.headYaw / 2;
        player.skin.head.rotation.y = this.headYaw / 2;
        player.skin.head.rotation.x = -this.headPitch;

        if (!this.still) {
            const ticks = this.clock * 20;
            const swing = Math.cos(ticks * 0.09) * 0.05 + 0.05;
            const sway = Math.sin(ticks * 0.067) * 0.05;

            player.skin.rightArm.rotation.z = -swing;
            player.skin.leftArm.rotation.z = swing;
            player.skin.rightArm.rotation.x = sway;
            player.skin.leftArm.rotation.x = -sway;
            player.cape.rotation.x = CAPE_ANGLE + Math.sin(ticks * 0.067) * 0.03;

            glintAt(this.glint.value, performance.now());
        }
    }

    private lookAt(): [number, number] {
        const rect = this.canvas.getBoundingClientRect();

        if (this.pointer === null || rect.width === 0 || rect.height === 0) {
            return [0, 0];
        }

        const camera = this.viewer.camera;

        this.pointerNdc.set(
            ((this.pointer.x - rect.left) / rect.width) * 2 - 1,
            -((this.pointer.y - rect.top) / rect.height) * 2 + 1
        );
        this.raycaster.setFromCamera(this.pointerNdc, camera);
        this.toward.copy(camera.position).sub(this.target).normalize();
        this.plane.setFromNormalAndCoplanarPoint(
            this.toward,
            this.hit.copy(this.toward).multiplyScalar(LOOK_DEPTH).add(this.target)
        );

        if (this.raycaster.ray.intersectPlane(this.plane, this.hit) === null) {
            return [0, 0];
        }

        const dx = this.hit.x - EYE.x;
        const dy = this.hit.y - EYE.y;
        const dz = this.hit.z - EYE.z;
        const yaw = Math.atan2(dx, dz);

        if (Math.abs(yaw) > BEHIND) {
            return [0, 0];
        }

        return [
            Math.max(-HEAD_YAW, Math.min(HEAD_YAW, yaw)),
            Math.max(-HEAD_PITCH, Math.min(HEAD_PITCH, Math.atan2(dy, Math.hypot(dx, dz)))),
        ];
    }
}

export function createPlayerScene(width: number, height: number): PlayerScene {
    return new Model(width, height);
}
