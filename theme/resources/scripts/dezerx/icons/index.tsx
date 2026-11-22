import type { ComponentType } from 'react';
import {
    Activity as LucideActivity,
    AlertTriangle as LucideAlertTriangle,
    Archive as LucideArchive,
    ArrowLeft as LucideArrowLeft,
    ArrowLeftRight as LucideArrowLeftRight,
    ArrowUpRight as LucideArrowUpRight,
    AtSign as LucideAtSign,
    Ban as LucideBan,
    BarChart3 as LucideBarChart3,
    Bed as LucideBed,
    Bell as LucideBell,
    Blocks as LucideBlocks,
    BookOpen as LucideBookOpen,
    Bot as LucideBot,
    Box as LucideBox,
    Boxes as LucideBoxes,
    Calendar as LucideCalendar,
    CalendarClock as LucideCalendarClock,
    Check as LucideCheck,
    CheckCheck as LucideCheckCheck,
    CheckCircle2 as LucideCheckCircle2,
    ChevronDown as LucideChevronDown,
    ChevronLeft as LucideChevronLeft,
    ChevronRight as LucideChevronRight,
    ChevronUp as LucideChevronUp,
    ChevronsRight as LucideChevronsRight,
    CircleAlert as LucideCircleAlert,
    ClipboardList as LucideClipboardList,
    Clock as LucideClock,
    Cloud as LucideCloud,
    CloudLightning as LucideCloudLightning,
    CloudRain as LucideCloudRain,
    Code2 as LucideCode2,
    Columns2 as LucideColumns2,
    Copy as LucideCopy,
    Cpu as LucideCpu,
    CreditCard as LucideCreditCard,
    Crown as LucideCrown,
    Database as LucideDatabase,
    Download as LucideDownload,
    Egg as LucideEgg,
    ExternalLink as LucideExternalLink,
    Eye as LucideEye,
    EyeOff as LucideEyeOff,
    FileArchive as LucideFileArchive,
    FileCode2 as LucideFileCode2,
    FileCog as LucideFileCog,
    FilePlus as LucideFilePlus,
    Filter as LucideFilter,
    Flame as LucideFlame,
    Folder as LucideFolder,
    FolderClosed as LucideFolderClosed,
    FolderOpen as LucideFolderOpen,
    FolderPlus as LucideFolderPlus,
    FolderTree as LucideFolderTree,
    Gamepad2 as LucideGamepad2,
    Globe as LucideGlobe,
    Globe2 as LucideGlobe2,
    Grid3x3 as LucideGrid3x3,
    GripHorizontal as LucideGripHorizontal,
    Hammer as LucideHammer,
    HardDrive as LucideHardDrive,
    Heart as LucideHeart,
    History as LucideHistory,
    Image as LucideImage,
    ImagePlus as LucideImagePlus,
    Inbox as LucideInbox,
    Info as LucideInfo,
    KeyRound as LucideKeyRound,
    Layers as LucideLayers,
    LayoutGrid as LucideLayoutGrid,
    LifeBuoy as LucideLifeBuoy,
    Link2 as LucideLink2,
    ListChecks as LucideListChecks,
    Loader2 as LucideLoader2,
    Lock as LucideLock,
    LockOpen as LucideLockOpen,
    LogOut as LucideLogOut,
    Mail as LucideMail,
    Map as LucideMap,
    MapPin as LucideMapPin,
    MemoryStick as LucideMemoryStick,
    Menu as LucideMenu,
    MessageCircle as LucideMessageCircle,
    Minus as LucideMinus,
    Monitor as LucideMonitor,
    Moon as LucideMoon,
    MoreVertical as LucideMoreVertical,
    Network as LucideNetwork,
    Newspaper as LucideNewspaper,
    PackageOpen as LucidePackageOpen,
    Paintbrush as LucidePaintbrush,
    Palette as LucidePalette,
    PawPrint as LucidePawPrint,
    Pencil as LucidePencil,
    PencilLine as LucidePencilLine,
    PictureInPicture2 as LucidePictureInPicture2,
    Play as LucidePlay,
    Plug as LucidePlug,
    Plus as LucidePlus,
    Power as LucidePower,
    Puzzle as LucidePuzzle,
    RefreshCw as LucideRefreshCw,
    Regex as LucideRegex,
    Rocket as LucideRocket,
    RotateCcw as LucideRotateCcw,
    RotateCw as LucideRotateCw,
    Save as LucideSave,
    Scissors as LucideScissors,
    Search as LucideSearch,
    SearchX as LucideSearchX,
    Send as LucideSend,
    Server as LucideServer,
    ServerCog as LucideServerCog,
    Settings as LucideSettings,
    Settings2 as LucideSettings2,
    Share2 as LucideShare2,
    Shield as LucideShield,
    ShieldAlert as LucideShieldAlert,
    ShieldCheck as LucideShieldCheck,
    ShieldOff as LucideShieldOff,
    ShoppingCart as LucideShoppingCart,
    Skull as LucideSkull,
    SlidersHorizontal as LucideSlidersHorizontal,
    Smartphone as LucideSmartphone,
    Smile as LucideSmile,
    Soup as LucideSoup,
    Square as LucideSquare,
    Star as LucideStar,
    Sun as LucideSun,
    Sunrise as LucideSunrise,
    Sunset as LucideSunset,
    Tag as LucideTag,
    Terminal as LucideTerminal,
    Trash2 as LucideTrash2,
    TriangleAlert as LucideTriangleAlert,
    Trophy as LucideTrophy,
    Unlock as LucideUnlock,
    Unplug as LucideUnplug,
    Upload as LucideUpload,
    UploadCloud as LucideUploadCloud,
    User as LucideUser,
    UserPlus as LucideUserPlus,
    UserRound as LucideUserRound,
    UserX as LucideUserX,
    Users as LucideUsers,
    UtensilsCrossed as LucideUtensilsCrossed,
    Wand2 as LucideWand2,
    Wrench as LucideWrench,
    X as LucideX,
    XCircle as LucideXCircle,
    Zap as LucideZap,
} from 'lucide-react/dist/esm/lucide-react.js';
import { themed } from './runtime';

export { IconSetProvider, loadIconSet, useIconSet, STROKE_SETS } from './runtime';
export type { Glyphs } from './runtime';

export type LucideIcon = ComponentType<Record<string, unknown>>;
export type LucideProps = Record<string, unknown>;

export const Activity = themed('Activity', LucideActivity as never);
export const AlertTriangle = themed('AlertTriangle', LucideAlertTriangle as never);
export const Archive = themed('Archive', LucideArchive as never);
export const ArrowLeft = themed('ArrowLeft', LucideArrowLeft as never);
export const ArrowLeftRight = themed('ArrowLeftRight', LucideArrowLeftRight as never);
export const ArrowUpRight = themed('ArrowUpRight', LucideArrowUpRight as never);
export const AtSign = themed('AtSign', LucideAtSign as never);
export const Ban = themed('Ban', LucideBan as never);
export const BarChart3 = themed('BarChart3', LucideBarChart3 as never);
export const Bed = themed('Bed', LucideBed as never);
export const Bell = themed('Bell', LucideBell as never);
export const Blocks = themed('Blocks', LucideBlocks as never);
export const BookOpen = themed('BookOpen', LucideBookOpen as never);
export const Bot = themed('Bot', LucideBot as never);
export const Box = themed('Box', LucideBox as never);
export const Boxes = themed('Boxes', LucideBoxes as never);
export const Calendar = themed('Calendar', LucideCalendar as never);
export const CalendarClock = themed('CalendarClock', LucideCalendarClock as never);
export const Check = themed('Check', LucideCheck as never);
export const CheckCheck = themed('CheckCheck', LucideCheckCheck as never);
export const CheckCircle2 = themed('CheckCircle2', LucideCheckCircle2 as never);
export const ChevronDown = themed('ChevronDown', LucideChevronDown as never);
export const ChevronLeft = themed('ChevronLeft', LucideChevronLeft as never);
export const ChevronRight = themed('ChevronRight', LucideChevronRight as never);
export const ChevronUp = themed('ChevronUp', LucideChevronUp as never);
export const ChevronsRight = themed('ChevronsRight', LucideChevronsRight as never);
export const CircleAlert = themed('CircleAlert', LucideCircleAlert as never);
export const ClipboardList = themed('ClipboardList', LucideClipboardList as never);
export const Clock = themed('Clock', LucideClock as never);
export const Cloud = themed('Cloud', LucideCloud as never);
export const CloudLightning = themed('CloudLightning', LucideCloudLightning as never);
export const CloudRain = themed('CloudRain', LucideCloudRain as never);
export const Code2 = themed('Code2', LucideCode2 as never);
export const Columns2 = themed('Columns2', LucideColumns2 as never);
export const Copy = themed('Copy', LucideCopy as never);
export const Cpu = themed('Cpu', LucideCpu as never);
export const CreditCard = themed('CreditCard', LucideCreditCard as never);
export const Crown = themed('Crown', LucideCrown as never);
export const Database = themed('Database', LucideDatabase as never);
export const Download = themed('Download', LucideDownload as never);
export const Egg = themed('Egg', LucideEgg as never);
export const ExternalLink = themed('ExternalLink', LucideExternalLink as never);
export const Eye = themed('Eye', LucideEye as never);
export const EyeOff = themed('EyeOff', LucideEyeOff as never);
export const FileArchive = themed('FileArchive', LucideFileArchive as never);
export const FileCode2 = themed('FileCode2', LucideFileCode2 as never);
export const FileCog = themed('FileCog', LucideFileCog as never);
export const FilePlus = themed('FilePlus', LucideFilePlus as never);
export const Filter = themed('Filter', LucideFilter as never);
export const Flame = themed('Flame', LucideFlame as never);
export const Folder = themed('Folder', LucideFolder as never);
export const FolderClosed = themed('FolderClosed', LucideFolderClosed as never);
export const FolderOpen = themed('FolderOpen', LucideFolderOpen as never);
export const FolderPlus = themed('FolderPlus', LucideFolderPlus as never);
export const FolderTree = themed('FolderTree', LucideFolderTree as never);
export const Gamepad2 = themed('Gamepad2', LucideGamepad2 as never);
export const Globe = themed('Globe', LucideGlobe as never);
export const Globe2 = themed('Globe2', LucideGlobe2 as never);
export const Grid3x3 = themed('Grid3x3', LucideGrid3x3 as never);
export const GripHorizontal = themed('GripHorizontal', LucideGripHorizontal as never);
export const Hammer = themed('Hammer', LucideHammer as never);
export const HardDrive = themed('HardDrive', LucideHardDrive as never);
export const Heart = themed('Heart', LucideHeart as never);
export const History = themed('History', LucideHistory as never);
export const Image = themed('Image', LucideImage as never);
export const ImagePlus = themed('ImagePlus', LucideImagePlus as never);
export const Inbox = themed('Inbox', LucideInbox as never);
export const Info = themed('Info', LucideInfo as never);
export const KeyRound = themed('KeyRound', LucideKeyRound as never);
export const Layers = themed('Layers', LucideLayers as never);
export const LayoutGrid = themed('LayoutGrid', LucideLayoutGrid as never);
export const LifeBuoy = themed('LifeBuoy', LucideLifeBuoy as never);
export const Link2 = themed('Link2', LucideLink2 as never);
export const ListChecks = themed('ListChecks', LucideListChecks as never);
export const Loader2 = themed('Loader2', LucideLoader2 as never);
export const Lock = themed('Lock', LucideLock as never);
export const LockOpen = themed('LockOpen', LucideLockOpen as never);
export const LogOut = themed('LogOut', LucideLogOut as never);
export const Mail = themed('Mail', LucideMail as never);
export const Map = themed('Map', LucideMap as never);
export const MapPin = themed('MapPin', LucideMapPin as never);
export const MemoryStick = themed('MemoryStick', LucideMemoryStick as never);
export const Menu = themed('Menu', LucideMenu as never);
export const MessageCircle = themed('MessageCircle', LucideMessageCircle as never);
export const Minus = themed('Minus', LucideMinus as never);
export const Monitor = themed('Monitor', LucideMonitor as never);
export const Moon = themed('Moon', LucideMoon as never);
export const MoreVertical = themed('MoreVertical', LucideMoreVertical as never);
export const Network = themed('Network', LucideNetwork as never);
export const Newspaper = themed('Newspaper', LucideNewspaper as never);
export const PackageOpen = themed('PackageOpen', LucidePackageOpen as never);
export const Paintbrush = themed('Paintbrush', LucidePaintbrush as never);
export const Palette = themed('Palette', LucidePalette as never);
export const PawPrint = themed('PawPrint', LucidePawPrint as never);
export const Pencil = themed('Pencil', LucidePencil as never);
export const PencilLine = themed('PencilLine', LucidePencilLine as never);
export const PictureInPicture2 = themed('PictureInPicture2', LucidePictureInPicture2 as never);
export const Play = themed('Play', LucidePlay as never);
export const Plug = themed('Plug', LucidePlug as never);
export const Plus = themed('Plus', LucidePlus as never);
export const Power = themed('Power', LucidePower as never);
export const Puzzle = themed('Puzzle', LucidePuzzle as never);
export const RefreshCw = themed('RefreshCw', LucideRefreshCw as never);
export const Regex = themed('Regex', LucideRegex as never);
export const Rocket = themed('Rocket', LucideRocket as never);
export const RotateCcw = themed('RotateCcw', LucideRotateCcw as never);
export const RotateCw = themed('RotateCw', LucideRotateCw as never);
export const Save = themed('Save', LucideSave as never);
export const Scissors = themed('Scissors', LucideScissors as never);
export const Search = themed('Search', LucideSearch as never);
export const SearchX = themed('SearchX', LucideSearchX as never);
export const Send = themed('Send', LucideSend as never);
export const Server = themed('Server', LucideServer as never);
export const ServerCog = themed('ServerCog', LucideServerCog as never);
export const Settings = themed('Settings', LucideSettings as never);
export const Settings2 = themed('Settings2', LucideSettings2 as never);
export const Share2 = themed('Share2', LucideShare2 as never);
export const Shield = themed('Shield', LucideShield as never);
export const ShieldAlert = themed('ShieldAlert', LucideShieldAlert as never);
export const ShieldCheck = themed('ShieldCheck', LucideShieldCheck as never);
export const ShieldOff = themed('ShieldOff', LucideShieldOff as never);
export const ShoppingCart = themed('ShoppingCart', LucideShoppingCart as never);
export const Skull = themed('Skull', LucideSkull as never);
export const SlidersHorizontal = themed('SlidersHorizontal', LucideSlidersHorizontal as never);
export const Smartphone = themed('Smartphone', LucideSmartphone as never);
export const Smile = themed('Smile', LucideSmile as never);
export const Soup = themed('Soup', LucideSoup as never);
export const Square = themed('Square', LucideSquare as never);
export const Star = themed('Star', LucideStar as never);
export const Sun = themed('Sun', LucideSun as never);
export const Sunrise = themed('Sunrise', LucideSunrise as never);
export const Sunset = themed('Sunset', LucideSunset as never);
export const Tag = themed('Tag', LucideTag as never);
export const Terminal = themed('Terminal', LucideTerminal as never);
export const Trash2 = themed('Trash2', LucideTrash2 as never);
export const TriangleAlert = themed('TriangleAlert', LucideTriangleAlert as never);
export const Trophy = themed('Trophy', LucideTrophy as never);
export const Unlock = themed('Unlock', LucideUnlock as never);
export const Unplug = themed('Unplug', LucideUnplug as never);
export const Upload = themed('Upload', LucideUpload as never);
export const UploadCloud = themed('UploadCloud', LucideUploadCloud as never);
export const User = themed('User', LucideUser as never);
export const UserPlus = themed('UserPlus', LucideUserPlus as never);
export const UserRound = themed('UserRound', LucideUserRound as never);
export const UserX = themed('UserX', LucideUserX as never);
export const Users = themed('Users', LucideUsers as never);
export const UtensilsCrossed = themed('UtensilsCrossed', LucideUtensilsCrossed as never);
export const Wand2 = themed('Wand2', LucideWand2 as never);
export const Wrench = themed('Wrench', LucideWrench as never);
export const X = themed('X', LucideX as never);
export const XCircle = themed('XCircle', LucideXCircle as never);
export const Zap = themed('Zap', LucideZap as never);
