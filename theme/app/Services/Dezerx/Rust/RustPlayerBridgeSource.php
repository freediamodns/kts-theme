<?php
 namespace Pterodactyl\Services\Dezerx\Rust; class RustPlayerBridgeSource { public const FILENAME = 'RustPlayerBridge.cs'; public const VERSION = '1.4.3'; public static function getSource( ?string $author = null, ?string $serverName = null, ?string $panelUrl = null, ?string $serverUuid = null ): string { $line = fn (?string $value) => trim(preg_replace('/[\x00-\x1F\x7F]+/u', ' ', (string) $value) ?? ''); $safeAuthor = addcslashes($line($author) ?: 'Rust Player Manager', '"\\'); $safeServerName = addcslashes($line($serverName) ?: 'Rust Server', '"\\'); $safePanelUrl = addcslashes(rtrim($line($panelUrl) ?: config('app.url', 'http://localhost'), '/'), '"\\'); $safeServerUuid = addcslashes($line($serverUuid), '"\\'); $code = <<<'CS'
// Reference: Oxide.Core
// Reference: UnityEngine.UI
using System;
using System.IO;
using System.Collections.Generic;
using System.Linq;
using Oxide.Core;
using Oxide.Core.Libraries.Covalence;
using Oxide.Core.Plugins;
using Oxide.Game.Rust.Cui;
using UnityEngine;
using Newtonsoft.Json;

namespace Oxide.Plugins
{
    [Info("RustPlayerBridge", "%%AUTHOR%%", "1.4.3")]
    [Description("Rust Player Manager - 3D Live Map & God Tools Companion Bridge")]
    public class RustPlayerBridge : CovalencePlugin
    {
        private const string PERM_ADMIN = "rustplayerbridge.admin";
        private const string CUI_MAIN = "Rpm_MainUI";
        private const string CUI_PANEL = "Rpm_PanelUI";

        private readonly HashSet<string> mutedPlayers = new HashSet<string>();
        private readonly HashSet<ulong> godmodePlayers = new HashSet<ulong>();
        private readonly HashSet<ulong> frozenPlayers = new HashSet<ulong>();
        private readonly Dictionary<ulong, Vector3> frozenPositions = new Dictionary<ulong, Vector3>();
        private readonly List<object> recentCombatEvents = new List<object>();
        private readonly List<object> recentKills = new List<object>();
        private readonly List<object> recentExplosions = new List<object>();

        // High-performance tracked entity caches (O(1) lookups instead of scene-wide FindObjectsOfType)
        private readonly HashSet<BuildingPrivlidge> activeToolCupboards = new HashSet<BuildingPrivlidge>();
        private readonly HashSet<BaseHelicopter> activeHelis = new HashSet<BaseHelicopter>();
        private readonly HashSet<CargoShip> activeCargoShips = new HashSet<CargoShip>();
        private readonly HashSet<BradleyAPC> activeBradleys = new HashSet<BradleyAPC>();
        private readonly HashSet<SupplyDrop> activeSupplyDrops = new HashSet<SupplyDrop>();
        private readonly HashSet<HackableLockedCrate> activeLockedCrates = new HashSet<HackableLockedCrate>();

        private bool serverGodmode = false;
        private Timer stateTimer;
        private Timer debouncedStateTimer;
        private readonly Dictionary<ulong, Timer> debouncedPlayerTimers = new Dictionary<ulong, Timer>();
        private List<object> cachedMonuments = null;
        private PluginConfig config;

        #region Configuration

        public class PluginConfig
        {
            [JsonProperty("PanelUrl")]
            public string PanelUrl { get; set; } = "%%PANEL_URL%%";

            [JsonProperty("ServerUuid")]
            public string ServerUuid { get; set; } = "%%SERVER_UUID%%";

            [JsonProperty("ServerName")]
            public string ServerName { get; set; } = "%%SERVER_NAME%%";

            [JsonProperty("DiscordUrl")]
            public string DiscordUrl { get; set; } = "";

            [JsonProperty("EnableInGameGui")]
            public bool EnableInGameGui { get; set; } = true;

            [JsonProperty("InGameGuiCommand")]
            public string InGameGuiCommand { get; set; } = "rgpm";

            [JsonProperty("PlayerPanelCommand")]
            public string PlayerPanelCommand { get; set; } = "panel";

            [JsonProperty("SyncIntervalSeconds")]
            public float SyncIntervalSeconds { get; set; } = 5f;

            [JsonProperty("AutoMod")]
            public AutoModConfig AutoMod { get; set; } = new AutoModConfig();

            [JsonProperty("Rates")]
            public RatesConfig Rates { get; set; } = new RatesConfig();
        }

        public class RatesConfig
        {
            [JsonProperty("enabled")]
            public bool Enabled { get; set; } = true;

            [JsonProperty("gather")]
            public float Gather { get; set; } = 1f;

            [JsonProperty("pickup")]
            public float Pickup { get; set; } = 1f;

            [JsonProperty("quarry")]
            public float Quarry { get; set; } = 1f;

            [JsonProperty("survey")]
            public float Survey { get; set; } = 1f;

            [JsonProperty("loot")]
            public float Loot { get; set; } = 1f;

            [JsonProperty("stackSize")]
            public int StackSize { get; set; } = 1;

            [JsonProperty("recyclerSpeed")]
            public float RecyclerSpeed { get; set; } = 1f;

            [JsonProperty("craftingSpeed")]
            public float CraftingSpeed { get; set; } = 1f;

            [JsonProperty("smeltingSpeed")]
            public float SmeltingSpeed { get; set; } = 1f;

            [JsonProperty("categoryStacks")]
            public Dictionary<string, int> CategoryStacks { get; set; } = new Dictionary<string, int>();
        }

        public class AutoModConfig
        {
            public bool Enabled { get; set; } = false;
            public string Action { get; set; } = "warn";
            public List<string> BannedWords { get; set; } = new List<string> { "cheat", "hack", "aimbot" };
        }

        protected override void LoadDefaultConfig()
        {
            config = new PluginConfig();
            SaveConfig();
        }

        protected override void LoadConfig()
        {
            base.LoadConfig();
            try
            {
                config = Config.ReadObject<PluginConfig>();
                if (config == null) LoadDefaultConfig();
            }
            catch
            {
                LoadDefaultConfig();
            }

            if (config == null) config = new PluginConfig();
            if (config.Rates == null) config.Rates = new RatesConfig();
            if (config.Rates.CategoryStacks == null) config.Rates.CategoryStacks = new Dictionary<string, int>();
            if (config.AutoMod == null) config.AutoMod = new AutoModConfig();
        }

        protected override void SaveConfig()
        {
            Config.WriteObject(config, true);
        }

        #endregion

        #region Oxide Hooks

        private void Init()
        {
            EnsureDirectories();

            // Register permissions
            permission.RegisterPermission(PERM_ADMIN, this);

            // Register console commands
            AddCovalenceCommand("rgpm.ping", nameof(CmdPing));
            AddCovalenceCommand("rgpm.players", nameof(CmdPlayers));
            AddCovalenceCommand("rgpm.player", nameof(CmdPlayer));
            AddCovalenceCommand("rgpm.export", nameof(CmdExport));
            AddCovalenceCommand("rgpm.dump", nameof(CmdExport));
            AddCovalenceCommand("rgpm.inv", nameof(CmdInventory));
            AddCovalenceCommand("rgpm.god", nameof(CmdGod));
            AddCovalenceCommand("rgpm.techtree", nameof(CmdTechTree));
            AddCovalenceCommand("rgpm.server", nameof(CmdServerAction));
            AddCovalenceCommand("rgpm.automod", nameof(CmdAutoMod));
            AddCovalenceCommand("rgpm.rates", nameof(CmdRates));
            AddCovalenceCommand("rgpm.convar", nameof(CmdConvar));
            AddCovalenceCommand("rgpm.demo", nameof(CmdDemo));
            AddCovalenceCommand("rgpm.cui", nameof(CmdCuiCallback));

            // Register in-game chat commands
            AddCovalenceCommand(config?.InGameGuiCommand ?? "rgpm", nameof(CmdChatRgpm));
            AddCovalenceCommand("pm", nameof(CmdChatRgpm));
            AddCovalenceCommand(config?.PlayerPanelCommand ?? "panel", nameof(CmdChatPanel));
        }

        private Dictionary<int, int> originalStackSizes = new Dictionary<int, int>();

        private void UpdateStackSizes()
        {
            if (ItemManager.itemList == null || config?.Rates == null) return;

            try
            {
                if (originalStackSizes.Count == 0)
                {
                    foreach (var def in ItemManager.itemList)
                    {
                        if (def != null) originalStackSizes[def.itemid] = def.stackable;
                    }
                }

                bool ratesEnabled = config.Rates.Enabled;
                int globalStackMult = Mathf.Max(1, config.Rates.StackSize);
                int g = Mathf.CeilToInt(config.Rates.Gather);
                int p = Mathf.CeilToInt(config.Rates.Pickup);
                int l = Mathf.CeilToInt(config.Rates.Loot);
                int effectiveGatherMult = Mathf.Max(1, Mathf.Max(g, Mathf.Max(p, l)));
                int effectiveStackMult = Mathf.Max(globalStackMult, effectiveGatherMult);

                foreach (var def in ItemManager.itemList)
                {
                    if (def == null) continue;
                    if (!originalStackSizes.TryGetValue(def.itemid, out int orig))
                    {
                        orig = def.stackable;
                        originalStackSizes[def.itemid] = orig;
                    }

                    if (!ratesEnabled || (effectiveStackMult == 1 && (config.Rates.CategoryStacks == null || config.Rates.CategoryStacks.Count == 0)))
                    {
                        def.stackable = orig;
                        continue;
                    }

                    int catMult = effectiveStackMult;
                    string catName = def.category.ToString();
                    if (config.Rates.CategoryStacks != null)
                    {
                        if (config.Rates.CategoryStacks.TryGetValue(catName, out int customCatMult) && customCatMult > 0)
                        {
                            catMult = customCatMult;
                        }
                        else if (config.Rates.CategoryStacks.TryGetValue("All", out int allCatMult) && allCatMult > 0)
                        {
                            catMult = allCatMult;
                        }
                    }

                    if (orig > 1 || def.category == ItemCategory.Resources || def.category == ItemCategory.Ammunition || def.category == ItemCategory.Medical || def.category == ItemCategory.Component || def.category == ItemCategory.Food)
                    {
                        long newStack = (long)orig * catMult;
                        def.stackable = (int)Math.Min((long)int.MaxValue, Math.Max(1L, newStack));
                    }
                }
                Puts($"[Rates] Updated stack sizes across {ItemManager.itemList.Count} item definitions (Stack multiplier: {effectiveStackMult}x).");
            }
            catch (Exception ex)
            {
                Puts($"[Rates] Error updating stack sizes: {ex.Message}");
            }
        }

        private void Loaded()
        {
            EnsureDirectories();
            if (stateTimer == null)
            {
                float interval = Mathf.Clamp(config?.SyncIntervalSeconds ?? 5f, 2f, 60f);
                stateTimer = timer.Every(interval, () =>
                {
                    ExportState();
                });
            }
        }

        private void OnServerInitialized()
        {
            EnsureDirectories();
            RefreshTrackedEntities();
            GetMonuments();
            UpdateStackSizes();
            Loaded();
            ExportState();
        }

        private void OnEntitySpawned(BaseNetworkable entity)
        {
            if (entity == null) return;
            if (entity is BuildingPrivlidge tc) activeToolCupboards.Add(tc);
            else if (entity is BaseHelicopter heli) activeHelis.Add(heli);
            else if (entity is CargoShip ship) activeCargoShips.Add(ship);
            else if (entity is BradleyAPC bradley) activeBradleys.Add(bradley);
            else if (entity is SupplyDrop drop) activeSupplyDrops.Add(drop);
            else if (entity is HackableLockedCrate crate) activeLockedCrates.Add(crate);
        }

        private void OnEntityKill(BaseNetworkable entity)
        {
            if (entity == null) return;
            if (entity is BuildingPrivlidge tc) activeToolCupboards.Remove(tc);
            else if (entity is BaseHelicopter heli) activeHelis.Remove(heli);
            else if (entity is CargoShip ship) activeCargoShips.Remove(ship);
            else if (entity is BradleyAPC bradley) activeBradleys.Remove(bradley);
            else if (entity is SupplyDrop drop) activeSupplyDrops.Remove(drop);
            else if (entity is HackableLockedCrate crate) activeLockedCrates.Remove(crate);
        }

        private void RefreshTrackedEntities()
        {
            activeToolCupboards.Clear();
            activeHelis.Clear();
            activeCargoShips.Clear();
            activeBradleys.Clear();
            activeSupplyDrops.Clear();
            activeLockedCrates.Clear();

            if (BaseNetworkable.serverEntities != null)
            {
                foreach (var entity in BaseNetworkable.serverEntities)
                {
                    if (entity == null || !entity.IsValid()) continue;
                    if (entity is BuildingPrivlidge tc) activeToolCupboards.Add(tc);
                    else if (entity is BaseHelicopter heli) activeHelis.Add(heli);
                    else if (entity is CargoShip ship) activeCargoShips.Add(ship);
                    else if (entity is BradleyAPC bradley) activeBradleys.Add(bradley);
                    else if (entity is SupplyDrop drop) activeSupplyDrops.Add(drop);
                    else if (entity is HackableLockedCrate crate) activeLockedCrates.Add(crate);
                }
            }
        }

        [ChatCommand("rgpm")]
        private void ChatCmdRgpm(BasePlayer player, string command, string[] args)
        {
            if (player == null) return;
            if (!player.IsAdmin && !permission.UserHasPermission(player.UserIDString, PERM_ADMIN))
            {
                player.ChatMessage("<color=#ef4444>[Admin]</color> <color=#94a3b8>You do not have permission to access Rust Player Manager.</color>");
                return;
            }
            OpenAdminUI(player);
        }

        [ChatCommand("pm")]
        private void ChatCmdPm(BasePlayer player, string command, string[] args)
        {
            ChatCmdRgpm(player, command, args);
        }

        [ChatCommand("panel")]
        private void ChatCmdPanel(BasePlayer player, string command, string[] args)
        {
            if (player == null) return;
            OpenPlayerPanelUI(player);
        }

        public void QueueStateExport(float delay = 0.5f)
        {
            if (debouncedStateTimer != null && !debouncedStateTimer.Destroyed) return;
            debouncedStateTimer = timer.Once(delay, () =>
            {
                debouncedStateTimer = null;
                ExportState();
            });
        }

        public void QueuePlayerExport(BasePlayer player)
        {
            if (player == null) return;
            ulong uid = player.userID;
            if (debouncedPlayerTimers.TryGetValue(uid, out Timer existingTimer) && existingTimer != null && !existingTimer.Destroyed)
            {
                return;
            }

            debouncedPlayerTimers[uid] = timer.Once(0.1f, () =>
            {
                debouncedPlayerTimers.Remove(uid);
                if (player != null)
                {
                    ExportPlayer(player);
                }
            });
        }

        private void Unload()
        {
            stateTimer?.Destroy();
            debouncedStateTimer?.Destroy();

            foreach (var t in debouncedPlayerTimers.Values)
            {
                t?.Destroy();
            }
            debouncedPlayerTimers.Clear();

            activeToolCupboards.Clear();
            activeHelis.Clear();
            activeCargoShips.Clear();
            activeBradleys.Clear();
            activeSupplyDrops.Clear();
            activeLockedCrates.Clear();

            if (originalStackSizes != null && originalStackSizes.Count > 0 && ItemManager.itemList != null)
            {
                foreach (var def in ItemManager.itemList)
                {
                    if (def != null && originalStackSizes.TryGetValue(def.itemid, out int orig))
                    {
                        def.stackable = orig;
                    }
                }
            }

            // Close all active CUI instances for online players
            foreach (var p in BasePlayer.activePlayerList)
            {
                if (p != null)
                {
                    CuiHelper.DestroyUi(p, CUI_MAIN);
                    CuiHelper.DestroyUi(p, CUI_PANEL);
                }
            }
        }

        private void OnPlayerConnected(BasePlayer player)
        {
            if (player == null) return;
            if (frozenPlayers.Contains(player.userID))
            {
                frozenPositions[player.userID] = player.transform.position;
                player.ChatMessage("<color=#38bdf8>[Admin]</color> <color=#ffffff>You are frozen by an administrator.</color>");
            }
            QueuePlayerExport(player);
            QueueStateExport(0.5f);
        }

        private void OnPlayerDisconnected(BasePlayer player, string reason)
        {
            if (player == null) return;
            QueuePlayerExport(player);
            QueueStateExport(0.5f);
        }

        private void OnPlayerSleep(BasePlayer player)
        {
            if (player != null)
            {
                QueuePlayerExport(player);
                QueueStateExport(1.0f);
            }
        }

        private void OnPlayerSleepEnded(BasePlayer player)
        {
            if (player != null)
            {
                QueuePlayerExport(player);
                QueueStateExport(1.0f);
            }
        }

        private void OnPlayerDeath(BasePlayer player, HitInfo info)
        {
            if (player != null)
            {
                try
                {
                    var pos = player.transform.position;
                    var killer = info?.InitiatorPlayer;
                    string killerName = killer != null ? (killer.displayName ?? "Player") : (info?.Initiator?.ShortPrefabName ?? "Environment");
                    string killerSteam = killer != null ? killer.UserIDString : "";
                    string weaponName = info?.Weapon?.GetItem()?.info?.displayName?.english
                        ?? info?.WeaponPrefab?.ShortPrefabName
                        ?? (info?.damageTypes?.GetMajorityDamageType().ToString() ?? "Unknown");

                    float distance = killer != null ? (float)Math.Round((double)Vector3.Distance(killer.transform.position, pos), 1) : 0f;
                    string bone = info?.boneName ?? "Body";
                    bool isHeadshot = info != null && info.isHeadshot;

                    lock (recentKills)
                    {
                        recentKills.Add(new
                        {
                            killer = killerName,
                            killerSteamId = killerSteam,
                            victim = player.displayName ?? "Player",
                            victimSteamId = player.UserIDString,
                            weapon = weaponName,
                            distance = distance,
                            hitbox = bone,
                            isHeadshot = isHeadshot,
                            pos = new { x = Math.Round((double)pos.x, 1), y = Math.Round((double)pos.y, 1), z = Math.Round((double)pos.z, 1) },
                            killerPos = killer != null ? new { x = Math.Round((double)killer.transform.position.x, 1), y = Math.Round((double)killer.transform.position.y, 1), z = Math.Round((double)killer.transform.position.z, 1) } : null,
                            grid = GetGridString(pos),
                            time = (int)DateTimeOffset.UtcNow.ToUnixTimeSeconds()
                        });
                        if (recentKills.Count > 60) recentKills.RemoveRange(0, recentKills.Count - 60);
                    }

                    if (killer != null)
                    {
                        lock (recentCombatEvents)
                        {
                            var kPos = killer.transform.position;
                            recentCombatEvents.Add(new
                            {
                                steamId = killer.UserIDString,
                                name = killer.displayName ?? "Player",
                                weapon = weaponName,
                                from = new { x = Math.Round((double)kPos.x, 1), y = Math.Round((double)kPos.y + 1.2, 1), z = Math.Round((double)kPos.z, 1) },
                                to = new { x = Math.Round((double)pos.x, 1), y = Math.Round((double)pos.y + 1.2, 1), z = Math.Round((double)pos.z, 1) },
                                time = (int)DateTimeOffset.UtcNow.ToUnixTimeSeconds()
                            });
                            if (recentCombatEvents.Count > 60) recentCombatEvents.RemoveRange(0, recentCombatEvents.Count - 60);
                        }
                    }
                }
                catch {}

                QueuePlayerExport(player);
                QueueStateExport(0.5f);
            }
        }

        private void OnExplosiveThrown(BasePlayer player, BaseEntity entity)
        {
            if (entity == null) return;
            try
            {
                var pos = entity.transform.position;
                string pName = entity.ShortPrefabName ?? "Explosive";
                string cleanType = "c4";
                string displayName = "C4 / Explosive";

                if (pName.Contains("c4") || pName.Contains("timed")) { cleanType = "c4"; displayName = "Timed Explosive (C4)"; }
                else if (pName.Contains("satchel")) { cleanType = "satchel"; displayName = "Satchel Charge"; }
                else if (pName.Contains("grenade")) { cleanType = "grenade"; displayName = "F1 Grenade"; }
                else if (pName.Contains("beencan")) { cleanType = "satchel"; displayName = "Beancan Grenade"; }

                lock (recentExplosions)
                {
                    recentExplosions.Add(new
                    {
                        id = entity.net?.ID.Value ?? 0,
                        type = cleanType,
                        name = displayName,
                        initiatorName = player != null ? player.displayName : "Unknown",
                        initiatorSteamId = player != null ? player.UserIDString : "",
                        pos = new { x = Math.Round((double)pos.x, 1), y = Math.Round((double)pos.y, 1), z = Math.Round((double)pos.z, 1) },
                        grid = GetGridString(pos),
                        radius = cleanType == "c4" ? 14f : 8f,
                        time = (int)DateTimeOffset.UtcNow.ToUnixTimeSeconds()
                    });
                    if (recentExplosions.Count > 50) recentExplosions.RemoveRange(0, recentExplosions.Count - 50);
                }
            }
            catch {}
        }

        private void OnExplosiveDropped(BasePlayer player, BaseEntity entity)
        {
            OnExplosiveThrown(player, entity);
        }

        private void OnPlayerRespawned(BasePlayer player)
        {
            if (player != null)
            {
                QueuePlayerExport(player);
                QueueStateExport(0.5f);
            }
        }

        private void OnPlayerRecovered(BasePlayer player)
        {
            if (player != null)
            {
                QueuePlayerExport(player);
                QueueStateExport(0.5f);
            }
        }

        private void OnPlayerInput(BasePlayer player, InputState input)
        {
            if (player == null || input == null) return;
            if (frozenPlayers.Contains(player.userID))
            {
                if (input.current != null)
                {
                    input.current.buttons = 0;
                }
                if (frozenPositions.TryGetValue(player.userID, out Vector3 targetPos))
                {
                    if (Vector3.Distance(player.transform.position, targetPos) > 0.05f)
                    {
                        player.Teleport(targetPos);
                        player.ForceUpdateTriggers();
                        player.SendNetworkUpdateImmediate();
                    }
                }
            }
        }

        private void OnPlayerTick(BasePlayer player, PlayerTick tick)
        {
            if (player == null) return;
            if (frozenPlayers.Contains(player.userID))
            {
                if (frozenPositions.TryGetValue(player.userID, out Vector3 targetPos))
                {
                    if (Vector3.Distance(player.transform.position, targetPos) > 0.05f)
                    {
                        player.Teleport(targetPos);
                        player.ForceUpdateTriggers();
                        player.SendNetworkUpdateImmediate();
                    }
                }
            }
        }

        private object OnPlayerAttack(BasePlayer attacker, HitInfo info)
        {
            if (attacker != null && frozenPlayers.Contains(attacker.userID))
            {
                if (info != null)
                {
                    info.damageTypes.Clear();
                    info.HitEntity = null;
                    info.DoHitEffects = false;
                }
                return true;
            }
            return null;
        }

        private object CanLootPlayer(BasePlayer target, BasePlayer looter)
        {
            if (looter != null && frozenPlayers.Contains(looter.userID)) return false;
            return null;
        }

        private object CanLootEntity(BasePlayer player, BaseEntity entity)
        {
            if (player != null && frozenPlayers.Contains(player.userID)) return false;
            return null;
        }

        private object OnItemAction(Item item, string action, BasePlayer player)
        {
            if (player != null && frozenPlayers.Contains(player.userID)) return false;
            return null;
        }

        private object OnEntityTakeDamage(BaseCombatEntity entity, HitInfo info)
        {
            if (entity == null) return null;

            var targetPlayer = entity as BasePlayer;
            if (targetPlayer != null && (serverGodmode || godmodePlayers.Contains(targetPlayer.userID)))
            {
                if (info != null)
                {
                    info.damageTypes.Clear();
                    info.HitEntity = null;
                    info.PointStart = Vector3.zero;
                    info.HitPositionWorld = Vector3.zero;
                    info.DoHitEffects = false;
                    info.HitMaterial = 0;
                }
                targetPlayer.health = targetPlayer.MaxHealth();
                if (targetPlayer.metabolism != null)
                {
                    targetPlayer.metabolism.bleeding.value = 0f;
                    targetPlayer.metabolism.poison.value = 0f;
                    targetPlayer.metabolism.radiation_poison.value = 0f;
                    targetPlayer.metabolism.oxygen.value = targetPlayer.metabolism.oxygen.max;
                }
                if (targetPlayer.IsWounded()) targetPlayer.StopWounded();
                return true;
            }
            return null;
        }

        private object OnRunPlayerMetabolism(PlayerMetabolism metabolism, BaseCombatEntity entity, float delta)
        {
            var player = entity as BasePlayer;
            if (player == null) return null;
            if (serverGodmode || godmodePlayers.Contains(player.userID))
            {
                player.health = player.MaxHealth();
                if (metabolism != null)
                {
                    metabolism.calories.value = metabolism.calories.max;
                    metabolism.hydration.value = metabolism.hydration.max;
                    metabolism.bleeding.value = 0f;
                    metabolism.radiation_poison.value = 0f;
                    metabolism.poison.value = 0f;
                    metabolism.oxygen.value = metabolism.oxygen.max;
                    metabolism.wetness.value = 0f;
                    metabolism.temperature.value = 25f;
                }
            }
            return null;
        }

        private void OnWeaponFired(BaseProjectile projectile, BasePlayer player, ItemModProjectile mod, ProtoBuf.ProjectileShoot projectiles)
        {
            if (player == null || projectile == null) return;
            try
            {
                var pos = player.transform.position;
                Vector3 aimDir = player.eyes != null ? player.eyes.BodyForward() : player.transform.forward;
                Vector3 endPos = pos + aimDir * 80f;
                string weaponName = projectile.GetItem()?.info?.displayName?.english ?? projectile.ShortPrefabName;

                lock (recentCombatEvents)
                {
                    recentCombatEvents.Add(new
                    {
                        steamId = player.UserIDString,
                        name = player.displayName ?? "Player",
                        weapon = weaponName,
                        from = new { x = Math.Round((double)pos.x, 1), y = Math.Round((double)pos.y + 1.2, 1), z = Math.Round((double)pos.z, 1) },
                        to = new { x = Math.Round((double)endPos.x, 1), y = Math.Round((double)endPos.y, 1), z = Math.Round((double)endPos.z, 1) },
                        time = (int)DateTimeOffset.UtcNow.ToUnixTimeSeconds()
                    });
                    if (recentCombatEvents.Count > 40)
                    {
                        recentCombatEvents.RemoveRange(0, recentCombatEvents.Count - 40);
                    }
                }
            }
            catch {}
        }

        private void OnRocketLaunched(BasePlayer player, BaseEntity rocket)
        {
            if (player == null || rocket == null) return;
            try
            {
                var pos = player.transform.position;
                var rPos = rocket.transform.position;
                lock (recentCombatEvents)
                {
                    recentCombatEvents.Add(new
                    {
                        steamId = player.UserIDString,
                        name = player.displayName ?? "Player",
                        weapon = "Rocket",
                        from = new { x = Math.Round((double)pos.x, 1), y = Math.Round((double)pos.y + 1.2, 1), z = Math.Round((double)pos.z, 1) },
                        to = new { x = Math.Round((double)rPos.x, 1), y = Math.Round((double)rPos.y, 1), z = Math.Round((double)rPos.z, 1) },
                        time = (int)DateTimeOffset.UtcNow.ToUnixTimeSeconds()
                    });
                    if (recentCombatEvents.Count > 40)
                    {
                        recentCombatEvents.RemoveRange(0, recentCombatEvents.Count - 40);
                    }
                }
            }
            catch {}
        }

        private void OnDispenserGather(ResourceDispenser dispenser, BasePlayer player, Item item)
        {
            if (config?.Rates == null || !config.Rates.Enabled || item == null) return;
            float mult = config.Rates.Gather;
            if (mult > 1f)
            {
                long newAmt = (long)Math.Round((double)item.amount * mult);
                item.amount = (int)Math.Min((long)int.MaxValue, Math.Max(1L, newAmt));
                if (item.info != null && item.info.stackable < item.amount)
                {
                    item.info.stackable = item.amount;
                }
            }
        }

        private void OnDispenserBonus(ResourceDispenser dispenser, BasePlayer player, Item item)
        {
            if (config?.Rates == null || !config.Rates.Enabled || item == null) return;
            float mult = config.Rates.Gather;
            if (mult > 1f)
            {
                long newAmt = (long)Math.Round((double)item.amount * mult);
                item.amount = (int)Math.Min((long)int.MaxValue, Math.Max(1L, newAmt));
                if (item.info != null && item.info.stackable < item.amount)
                {
                    item.info.stackable = item.amount;
                }
            }
        }

        private void OnCollectiblePickup(Item item, BasePlayer player)
        {
            if (config?.Rates == null || !config.Rates.Enabled || item == null) return;
            float mult = config.Rates.Pickup;
            if (mult > 1f)
            {
                long newAmt = (long)Math.Round((double)item.amount * mult);
                item.amount = (int)Math.Min((long)int.MaxValue, Math.Max(1L, newAmt));
                if (item.info != null && item.info.stackable < item.amount)
                {
                    item.info.stackable = item.amount;
                }
            }
        }

        private void OnGrowableGathered(GrowableEntity plant, Item item, BasePlayer player)
        {
            if (config?.Rates == null || !config.Rates.Enabled || item == null) return;
            float mult = config.Rates.Pickup;
            if (mult > 1f)
            {
                long newAmt = (long)Math.Round((double)item.amount * mult);
                item.amount = (int)Math.Min((long)int.MaxValue, Math.Max(1L, newAmt));
                if (item.info != null && item.info.stackable < item.amount)
                {
                    item.info.stackable = item.amount;
                }
            }
        }

        private void OnQuarryGather(MiningQuarry quarry, Item item)
        {
            if (config?.Rates == null || !config.Rates.Enabled || item == null) return;
            float mult = config.Rates.Quarry;
            if (mult > 1f)
            {
                long newAmt = (long)Math.Round((double)item.amount * mult);
                item.amount = (int)Math.Min((long)int.MaxValue, Math.Max(1L, newAmt));
                if (item.info != null && item.info.stackable < item.amount)
                {
                    item.info.stackable = item.amount;
                }
            }
        }

        private void OnSurveyGather(SurveyCharge survey, Item item)
        {
            if (config?.Rates == null || !config.Rates.Enabled || item == null) return;
            float mult = config.Rates.Survey;
            if (mult > 1f)
            {
                long newAmt = (long)Math.Round((double)item.amount * mult);
                item.amount = (int)Math.Min((long)int.MaxValue, Math.Max(1L, newAmt));
                if (item.info != null && item.info.stackable < item.amount)
                {
                    item.info.stackable = item.amount;
                }
            }
        }

        private void OnLootSpawn(LootContainer container)
        {
            if (config?.Rates == null || !config.Rates.Enabled || container?.inventory?.itemList == null) return;
            float mult = config.Rates.Loot;
            if (mult > 1f)
            {
                foreach (var item in container.inventory.itemList)
                {
                    if (item != null && item.amount > 0 && item.info != null)
                    {
                        long newAmt = (long)Math.Round((double)item.amount * mult);
                        if (item.info.stackable < newAmt)
                        {
                            item.info.stackable = (int)Math.Min((long)int.MaxValue, Math.Max(1L, newAmt));
                        }
                        item.amount = (int)Math.Min((long)item.info.stackable, Math.Max(1L, newAmt));
                    }
                }
            }
        }

        private void OnItemCraft(ItemCraftTask task)
        {
            if (config?.Rates == null || !config.Rates.Enabled || task == null) return;
            float speed = config.Rates.CraftingSpeed;
            if (speed >= 100f)
            {
                task.endTime = UnityEngine.Time.realtimeSinceStartup;
            }
            else if (speed > 1f)
            {
                float now = UnityEngine.Time.realtimeSinceStartup;
                float remaining = Mathf.Max(0.01f, task.endTime - now);
                task.endTime = now + (remaining / speed);
            }
        }

        private void OnItemSmelt(Item item, BaseOven oven)
        {
            if (config?.Rates == null || !config.Rates.Enabled || item == null) return;
            float speed = config.Rates.SmeltingSpeed;
            if (speed > 1f)
            {
                long newAmt = (long)Math.Round((double)item.amount * speed);
                item.amount = (int)Math.Min((long)int.MaxValue, Math.Max(1L, newAmt));
                if (item.info != null && item.info.stackable < item.amount)
                {
                    item.info.stackable = item.amount;
                }
            }
        }

        private void OnRecycleItem(Recycler recycler, Item item)
        {
            if (config?.Rates == null || !config.Rates.Enabled || item == null) return;
            float speed = config.Rates.RecyclerSpeed;
            if (speed > 1f)
            {
                long newAmt = (long)Math.Round((double)item.amount * speed);
                item.amount = (int)Math.Min((long)int.MaxValue, Math.Max(1L, newAmt));
                if (item.info != null && item.info.stackable < item.amount)
                {
                    item.info.stackable = item.amount;
                }
            }
        }

        private object OnUserChat(IPlayer player, string message)
        {
            if (player == null || string.IsNullOrEmpty(message)) return null;

            if (mutedPlayers.Contains(player.Id))
            {
                player.Message("<color=#ef4444>[Admin]</color> <color=#94a3b8>You are muted and cannot send chat messages.</color>");
                return true;
            }

            if (config?.AutoMod != null && config.AutoMod.Enabled && config.AutoMod.BannedWords != null)
            {
                string lower = message.ToLowerInvariant();
                bool matches = config.AutoMod.BannedWords.Any(w => !string.IsNullOrEmpty(w) && lower.Contains(w.ToLowerInvariant()));

                if (matches)
                {
                    string act = (config.AutoMod.Action ?? "warn").ToLowerInvariant();
                    if (act == "kick")
                    {
                        var basePlayer = player.Object as BasePlayer;
                        basePlayer?.Kick("[Auto-Mod] Disallowed language detected.");
                        return true;
                    }
                    else if (act == "mute")
                    {
                        mutedPlayers.Add(player.Id);
                        player.Message("<color=#ef4444>[Auto-Mod]</color> <color=#94a3b8>You have been muted for prohibited language.</color>");
                        return true;
                    }
                    else
                    {
                        player.Message("<color=#f59e0b>[Auto-Mod]</color> <color=#94a3b8>Please adhere to server chat rules.</color>");
                        return true;
                    }
                }
            }

            return null;
        }

        private object CanUserLogin(string name, string id, string ipAddress)
        {
            if (ulong.TryParse(id, out ulong steamId))
            {
                var user = ServerUsers.Get(steamId);
                if (user != null && user.group == ServerUsers.UserGroup.Banned)
                {
                    long now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
                    if (user.expiry > 0 && user.expiry <= now)
                    {
                        // Temporary ban has expired, lift it immediately
                        ServerUsers.Remove(steamId);
                        ServerUsers.Save();
                        ExportState();
                        return null;
                    }
                    string reason = !string.IsNullOrEmpty(user.notes) ? user.notes : "Violating server rules";
                    if (user.expiry > 0)
                    {
                        long remaining = user.expiry - now;
                        TimeSpan t = TimeSpan.FromSeconds(remaining);
                        string timeStr = t.Days > 0 ? $"{t.Days}d {t.Hours}h" : (t.Hours > 0 ? $"{t.Hours}h {t.Minutes}m" : $"{t.Minutes}m {t.Seconds}s");
                        return $"You are temporarily banned for {timeStr}: {reason}";
                    }
                    return $"You are permanently banned: {reason}";
                }
            }
            return null;
        }

        #endregion

        #region In-Game CUI System (Rust Player Manager GUI)

        private readonly Dictionary<ulong, string> activeTab = new Dictionary<ulong, string>();
        private readonly Dictionary<ulong, ulong> activeSelectedPlayer = new Dictionary<ulong, ulong>();
        private readonly Dictionary<ulong, int> activePage = new Dictionary<ulong, int>();

        private void CmdCuiCallback(IPlayer caller, string command, string[] args)
        {
            var basePlayer = caller?.Object as BasePlayer;
            if (basePlayer == null) return;
            if (args == null || args.Length == 0) return;
            string action = args[0].ToLowerInvariant();

            // Anyone may close their own window: the /panel one players open has this button too.
            if (action == "close")
            {
                CuiHelper.DestroyUi(basePlayer, CUI_MAIN);
                CuiHelper.DestroyUi(basePlayer, CUI_PANEL);
                return;
            }

            if (!IsAdmin(caller)) return;

            if (action == "tab" && args.Length > 1)
            {
                activeTab[basePlayer.userID] = args[1];
                OpenAdminUI(basePlayer);
                return;
            }

            if (action == "page" && args.Length > 1 && int.TryParse(args[1], out int pIndex))
            {
                activePage[basePlayer.userID] = Math.Max(0, pIndex);
                OpenAdminUI(basePlayer);
                return;
            }

            if (action == "select" && args.Length > 1 && ulong.TryParse(args[1], out ulong targetId))
            {
                activeSelectedPlayer[basePlayer.userID] = targetId;
                OpenAdminUI(basePlayer);
                return;
            }

            if (action == "rates" && args.Length > 1)
            {
                string subAction = args[1].ToLowerInvariant();
                if (subAction == "toggle")
                {
                    config.Rates.Enabled = !config.Rates.Enabled;
                    SaveConfig();
                    UpdateStackSizes();
                    basePlayer.ChatMessage($"<color=#38bdf8>[Admin]</color> <color=#ffffff>Rates Engine</color> {(config.Rates.Enabled ? "<color=#10b981>ENABLED</color>" : "<color=#ef4444>DISABLED</color>")}.");
                }
                else if (subAction == "preset" && args.Length > 2 && float.TryParse(args[2], out float mult))
                {
                    config.Rates.Enabled = true;
                    config.Rates.Gather = mult;
                    config.Rates.Pickup = mult;
                    config.Rates.Quarry = mult;
                    config.Rates.Survey = mult;
                    config.Rates.Loot = mult;
                    config.Rates.StackSize = (int)mult;
                    if (mult >= 100f)
                    {
                        config.Rates.CraftingSpeed = 100f;
                        config.Rates.SmeltingSpeed = 10f;
                        config.Rates.RecyclerSpeed = 10f;
                    }
                    SaveConfig();
                    UpdateStackSizes();
                    basePlayer.ChatMessage($"<color=#38bdf8>[Admin]</color> <color=#ffffff>Applied <color=#38bdf8>{mult}x</color> rates & stack size preset.</color>");
                }
                else if (subAction == "instantcraft")
                {
                    config.Rates.CraftingSpeed = config.Rates.CraftingSpeed >= 100f ? 1f : 100f;
                    SaveConfig();
                    basePlayer.ChatMessage($"<color=#38bdf8>[Admin]</color> <color=#ffffff>Instant Crafting</color> {(config.Rates.CraftingSpeed >= 100f ? "<color=#10b981>ENABLED</color>" : "<color=#ef4444>DISABLED</color>")}.");
                }
                OpenAdminUI(basePlayer);
                return;
            }

            if (action == "action" && args.Length > 2 && ulong.TryParse(args[1], out ulong targetSteamId))
            {
                string act = args[2].ToLowerInvariant();
                var target = FindPlayer(targetSteamId);

                if (target != null)
                {
                    switch (act)
                    {
                        case "heal":
                            target.health = target.MaxHealth();
                            if (target.metabolism != null)
                            {
                                target.metabolism.calories.value = target.metabolism.calories.max;
                                target.metabolism.hydration.value = target.metabolism.hydration.max;
                                target.metabolism.bleeding.value = 0f;
                                target.metabolism.radiation_poison.value = 0f;
                            }
                            if (target.IsWounded()) target.StopWounded();
                            target.SendNetworkUpdateImmediate();
                            basePlayer.ChatMessage($"<color=#10b981>[Admin]</color> <color=#ffffff>Healed</color> <color=#38bdf8>{target.displayName}</color>.");
                            break;
                        case "feed":
                            if (target.metabolism != null)
                            {
                                target.metabolism.calories.value = target.metabolism.calories.max;
                                target.metabolism.hydration.value = target.metabolism.hydration.max;
                            }
                            target.SendNetworkUpdateImmediate();
                            basePlayer.ChatMessage($"<color=#10b981>[Admin]</color> <color=#ffffff>Fed</color> <color=#38bdf8>{target.displayName}</color>.");
                            break;
                        case "godmode":
                            if (godmodePlayers.Contains(target.userID))
                            {
                                godmodePlayers.Remove(target.userID);
                                basePlayer.ChatMessage($"<color=#f59e0b>[Admin]</color> <color=#ffffff>Godmode disabled for</color> <color=#38bdf8>{target.displayName}</color>.");
                            }
                            else
                            {
                                godmodePlayers.Add(target.userID);
                                basePlayer.ChatMessage($"<color=#10b981>[Admin]</color> <color=#ffffff>Godmode enabled for</color> <color=#38bdf8>{target.displayName}</color>.");
                            }
                            target.SendNetworkUpdateImmediate();
                            break;
                        case "freeze":
                            frozenPlayers.Add(target.userID);
                            frozenPositions[target.userID] = target.transform.position;
                            target.ChatMessage("<color=#38bdf8>[Admin]</color> <color=#ffffff>You have been frozen by an administrator.</color>");
                            target.SendNetworkUpdateImmediate();
                            basePlayer.ChatMessage($"<color=#38bdf8>[Admin]</color> <color=#ffffff>Frozen</color> <color=#38bdf8>{target.displayName}</color>.");
                            break;
                        case "unfreeze":
                            frozenPlayers.Remove(target.userID);
                            frozenPositions.Remove(target.userID);
                            target.ChatMessage("<color=#10b981>[Admin]</color> <color=#ffffff>You have been unfrozen.</color>");
                            target.SendNetworkUpdateImmediate();
                            basePlayer.ChatMessage($"<color=#10b981>[Admin]</color> <color=#ffffff>Unfrozen</color> <color=#38bdf8>{target.displayName}</color>.");
                            break;
                        case "resurrect":
                            if (target.IsWounded()) target.StopWounded();
                            if (target.IsSleeping()) target.EndSleeping();
                            if (target.IsDead() || target.health <= 0f) target.Respawn();
                            target.health = target.MaxHealth();
                            if (target.metabolism != null)
                            {
                                target.metabolism.calories.value = target.metabolism.calories.max;
                                target.metabolism.hydration.value = target.metabolism.hydration.max;
                                target.metabolism.bleeding.value = 0f;
                                target.metabolism.radiation_poison.value = 0f;
                            }
                            target.SendNetworkUpdateImmediate();
                            basePlayer.ChatMessage($"<color=#10b981>[Admin]</color> <color=#ffffff>Resurrected</color> <color=#38bdf8>{target.displayName}</color>.");
                            break;
                        case "tp":
                            basePlayer.Teleport(target.transform.position);
                            basePlayer.ChatMessage($"<color=#38bdf8>[Admin]</color> <color=#ffffff>Teleported to</color> <color=#38bdf8>{target.displayName}</color>.");
                            break;
                        case "bring":
                            target.Teleport(basePlayer.transform.position);
                            basePlayer.ChatMessage($"<color=#38bdf8>[Admin]</color> <color=#ffffff>Brought</color> <color=#38bdf8>{target.displayName}</color> <color=#ffffff>to your position.</color>");
                            break;
                        case "kill":
                            target.Hurt(10000f);
                            if (!target.IsDead()) target.Die();
                            basePlayer.ChatMessage($"<color=#ef4444>[Admin]</color> <color=#ffffff>Killed</color> <color=#38bdf8>{target.displayName}</color>.");
                            break;
                        case "kick":
                            target.Kick("[Admin] Kicked by administrator via manager GUI.");
                            basePlayer.ChatMessage($"<color=#ef4444>[Admin]</color> <color=#ffffff>Kicked</color> <color=#38bdf8>{target.displayName}</color>.");
                            break;
                        case "ban":
                            ServerUsers.Set(target.userID, ServerUsers.UserGroup.Banned, target.displayName, "Banned via Rust Player Manager");
                            ServerUsers.Save();
                            target.Kick("[Admin] You have been banned from this server.");
                            basePlayer.ChatMessage($"<color=#ef4444>[Admin]</color> <color=#ffffff>Banned</color> <color=#38bdf8>{target.displayName}</color>.");
                            break;
                    }
                    ExportPlayer(target);
                    ExportState();
                }
                OpenAdminUI(basePlayer);
                return;
            }

            if (action == "god" && args.Length > 1)
            {
                string godAct = args[1].ToLowerInvariant();
                switch (godAct)
                {
                    case "healall":
                        foreach (var p in BasePlayer.activePlayerList)
                        {
                            if (p == null) continue;
                            p.health = p.MaxHealth();
                            if (p.metabolism != null)
                            {
                                p.metabolism.calories.value = p.metabolism.calories.max;
                                p.metabolism.hydration.value = p.metabolism.hydration.max;
                                p.metabolism.bleeding.value = 0f;
                                p.metabolism.radiation_poison.value = 0f;
                            }
                            if (p.IsWounded()) p.StopWounded();
                            p.SendNetworkUpdateImmediate();
                        }
                        foreach (var p in BasePlayer.sleepingPlayerList)
                        {
                            if (p == null || BasePlayer.activePlayerList.Contains(p)) continue;
                            p.health = p.MaxHealth();
                            if (p.metabolism != null)
                            {
                                p.metabolism.calories.value = p.metabolism.calories.max;
                                p.metabolism.hydration.value = p.metabolism.hydration.max;
                                p.metabolism.bleeding.value = 0f;
                                p.metabolism.radiation_poison.value = 0f;
                            }
                            p.SendNetworkUpdateImmediate();
                        }
                        basePlayer.ChatMessage("<color=#10b981>[Admin]</color> <color=#ffffff>Healed all active and sleeping players.</color>");
                        break;
                    case "feedall":
                        foreach (var p in BasePlayer.activePlayerList)
                        {
                            if (p == null) continue;
                            if (p.metabolism != null)
                            {
                                p.metabolism.calories.value = p.metabolism.calories.max;
                                p.metabolism.hydration.value = p.metabolism.hydration.max;
                            }
                            p.SendNetworkUpdateImmediate();
                        }
                        foreach (var p in BasePlayer.sleepingPlayerList)
                        {
                            if (p == null || BasePlayer.activePlayerList.Contains(p)) continue;
                            if (p.metabolism != null)
                            {
                                p.metabolism.calories.value = p.metabolism.calories.max;
                                p.metabolism.hydration.value = p.metabolism.hydration.max;
                            }
                            p.SendNetworkUpdateImmediate();
                        }
                        basePlayer.ChatMessage("<color=#10b981>[Admin]</color> <color=#ffffff>Fed all active and sleeping players.</color>");
                        break;
                    case "godall":
                        serverGodmode = !serverGodmode;
                        basePlayer.ChatMessage($"<color=#38bdf8>[Admin]</color> <color=#ffffff>Server Godmode</color> {(serverGodmode ? "<color=#10b981>ENABLED</color>" : "<color=#ef4444>DISABLED</color>")}.");
                        break;
                    case "airdrop":
                        ConsoleSystem.Run(ConsoleSystem.Option.Server, "supply.drop");
                        basePlayer.ChatMessage("<color=#f59e0b>[Admin]</color> <color=#ffffff>Called Supply Drop.</color>");
                        break;
                    case "heli":
                        ConsoleSystem.Run(ConsoleSystem.Option.Server, "heli.call");
                        basePlayer.ChatMessage("<color=#f59e0b>[Admin]</color> <color=#ffffff>Called Patrol Helicopter.</color>");
                        break;
                    case "cargoship":
                        ConsoleSystem.Run(ConsoleSystem.Option.Server, "cargoship.call");
                        basePlayer.ChatMessage("<color=#f59e0b>[Admin]</color> <color=#ffffff>Called Cargo Ship.</color>");
                        break;
                    case "day":
                        ConsoleSystem.Run(ConsoleSystem.Option.Server, "env.time 12");
                        basePlayer.ChatMessage("<color=#10b981>[Admin]</color> <color=#ffffff>Set world time to 12:00 (Noon).</color>");
                        break;
                    case "night":
                        ConsoleSystem.Run(ConsoleSystem.Option.Server, "env.time 0");
                        basePlayer.ChatMessage("<color=#10b981>[Admin]</color> <color=#ffffff>Set world time to 00:00 (Midnight).</color>");
                        break;
                    case "weather_clear":
                        ConsoleSystem.Run(ConsoleSystem.Option.Server, "weather.clouds 0; weather.rain 0; weather.fog 0; weather.wind 0");
                        basePlayer.ChatMessage("<color=#10b981>[Admin]</color> <color=#ffffff>Weather set to Clear.</color>");
                        break;
                    case "weather_storm":
                        ConsoleSystem.Run(ConsoleSystem.Option.Server, "weather.clouds 1; weather.rain 1; weather.storm 1; weather.wind 1");
                        basePlayer.ChatMessage("<color=#f59e0b>[Admin]</color> <color=#ffffff>Weather set to Storm.</color>");
                        break;
                    case "killsleepers":
                        int count = 0;
                        var sleepers = new HashSet<BasePlayer>();
                        foreach (var p in BasePlayer.sleepingPlayerList)
                        {
                            if (p != null) sleepers.Add(p);
                        }
                        foreach (var p in BasePlayer.allPlayerList)
                        {
                            if (p != null && (p.IsSleeping() || !p.IsConnected)) sleepers.Add(p);
                        }
                        foreach (var p in sleepers)
                        {
                            try
                            {
                                godmodePlayers.Remove(p.userID);
                                p.health = 0f;
                                if (p.metabolism != null)
                                {
                                    p.metabolism.calories.value = 0f;
                                    p.metabolism.hydration.value = 0f;
                                }
                                try { p.Die(); } catch { p.Hurt(100000f, Rust.DamageType.Suicide, null, false); }
                                p.SendNetworkUpdateImmediate();
                                count++;
                            }
                            catch {}
                        }
                        basePlayer.ChatMessage($"<color=#ef4444>[Admin]</color> <color=#ffffff>Killed {count} sleeping players.</color>");
                        break;
                }
                ExportState();
                OpenAdminUI(basePlayer);
                return;
            }

            if (action == "techtree" && args.Length > 2 && ulong.TryParse(args[1], out ulong ttSteamId))
            {
                string ttAct = args[2].ToLowerInvariant();
                var target = FindPlayer(ttSteamId);
                if (target != null && target.blueprints != null && ItemManager.itemList != null)
                {
                    if (ttAct == "unlockall")
                    {
                        foreach (var def in ItemManager.itemList)
                        {
                            if (def != null && def.Blueprint != null) target.blueprints.Unlock(def);
                        }
                        target.SendNetworkUpdateImmediate();
                        basePlayer.ChatMessage($"<color=#10b981>[Admin]</color> <color=#ffffff>Unlocked all blueprints for</color> <color=#38bdf8>{target.displayName}</color>.");
                    }
                    else if (ttAct == "reset")
                    {
                        target.blueprints.Reset();
                        target.SendNetworkUpdateImmediate();
                        basePlayer.ChatMessage($"<color=#f59e0b>[Admin]</color> <color=#ffffff>Reset and locked blueprints for</color> <color=#38bdf8>{target.displayName}</color>.");
                    }
                    ExportPlayer(target);
                    ExportState();
                }
                OpenAdminUI(basePlayer);
                return;
            }
        }

        private void CmdChatRgpm(IPlayer caller, string command, string[] args)
        {
            var basePlayer = caller?.Object as BasePlayer;
            if (basePlayer == null) return;

            if (!IsAdmin(caller))
            {
                caller.Message("<color=#ef4444>[Admin]</color> <color=#94a3b8>You do not have permission to access Rust Player Manager.</color>");
                return;
            }

            OpenAdminUI(basePlayer);
        }

        private void CmdChatPanel(IPlayer caller, string command, string[] args)
        {
            var basePlayer = caller?.Object as BasePlayer;
            if (basePlayer == null) return;

            OpenPlayerPanelUI(basePlayer);
        }

        public void OpenAdminUI(BasePlayer player)
        {
            if (player == null) return;

            CuiHelper.DestroyUi(player, CUI_MAIN);

            if (!activeTab.ContainsKey(player.userID))
                activeTab[player.userID] = "players";

            string currentTab = activeTab[player.userID];

            var container = new CuiElementContainer();

            // Background Root Modal - Frosted Rust Player Manager KTS Host Dark Surface
            container.Add(new CuiPanel
            {
                Image = { Color = "0.06 0.08 0.11 0.98", Material = "assets/content/ui/uibackgroundblur.mat" },
                RectTransform = { AnchorMin = "0.10 0.06", AnchorMax = "0.90 0.94" },
                CursorEnabled = true
            }, "Overlay", CUI_MAIN);

            // Outer Hairline Border
            container.Add(new CuiPanel
            {
                Image = { Color = "0.14 0.17 0.24 0.4" },
                RectTransform = { AnchorMin = "0 0", AnchorMax = "1 1" }
            }, CUI_MAIN, "Rpm_Border");

            // Top Header Bar
            container.Add(new CuiPanel
            {
                Image = { Color = "0.09 0.11 0.16 0.98" },
                RectTransform = { AnchorMin = "0 0.92", AnchorMax = "1 1" }
            }, CUI_MAIN, "Rpm_Header");

            string displayTitle = !string.IsNullOrEmpty(config.ServerName) ? config.ServerName.ToUpperInvariant() : "RUST SERVER";

            // Header Title with Rust Player Manager Branding
            container.Add(new CuiLabel
            {
                Text = { Text = $"<b><color=#38bdf8><size=14>CENTRIX</size></color> <color=#ffffff><size=13>RUST MANAGER</size></color></b>\n<color=#64748b><size=9>LIVE SERVER CONTROLLER • {displayTitle}</size></color>", FontSize = 12, Align = TextAnchor.MiddleLeft, Color = "1 1 1 1" },
                RectTransform = { AnchorMin = "0.02 0", AnchorMax = "0.45 1" }
            }, "Rpm_Header");

            // Server Quick Stats Pills
            int curFps = (int)Math.Round((double)Performance.current.frameRate);
            string statsText = $"<color=#10b981>● ONLINE</color>  |  FPS: <color=#10b981>{curFps}</color>  |  ENTS: <color=#38bdf8>{BaseNetworkable.serverEntities.Count:N0}</color>  |  PLAYERS: <color=#38bdf8>{BasePlayer.activePlayerList.Count}/{ConVar.Server.maxplayers}</color>";
            container.Add(new CuiLabel
            {
                Text = { Text = $"<b>{statsText}</b>", FontSize = 10, Align = TextAnchor.MiddleRight, Color = "0.58 0.64 0.72 1" },
                RectTransform = { AnchorMin = "0.45 0", AnchorMax = "0.94 1" }
            }, "Rpm_Header");

            // Close Button [X]
            container.Add(new CuiButton
            {
                Button = { Command = "rgpm.cui close", Color = "0.93 0.27 0.27 0.85" },
                RectTransform = { AnchorMin = "0.955 0.18", AnchorMax = "0.988 0.82" },
                Text = { Text = "<b>✕</b>", FontSize = 12, Align = TextAnchor.MiddleCenter, Color = "1 1 1 1" }
            }, "Rpm_Header");

            // Sub-Navigation Tab Bar
            container.Add(new CuiPanel
            {
                Image = { Color = "0.07 0.09 0.12 0.9" },
                RectTransform = { AnchorMin = "0 0.84", AnchorMax = "1 0.92" }
            }, CUI_MAIN, "Rpm_Nav");

            string[] tabs = { "players", "rates", "god", "techtree", "automod", "panel" };
            string[] tabLabels = { "PLAYERS", "RATES", "SERVER TOOLS", "TECH TREE", "AUTO MOD", "WEB DASHBOARD" };

            for (int i = 0; i < tabs.Length; i++)
            {
                string tabKey = tabs[i];
                string label = tabLabels[i];
                bool isSelected = currentTab == tabKey;

                float xMin = 0.015f + (i * 0.163f);
                float xMax = xMin + 0.155f;

                string btnColor = isSelected ? "0.22 0.50 0.75 0.9" : "0.10 0.12 0.16 0.85";
                string textColor = isSelected ? "#ffffff" : "#8c96a5";

                container.Add(new CuiButton
                {
                    Button = { Command = $"rgpm.cui tab {tabKey}", Color = btnColor },
                    RectTransform = { AnchorMin = $"{xMin} 0.15", AnchorMax = $"{xMax} 0.85" },
                    Text = { Text = $"<b><color={textColor}>{label}</color></b>", FontSize = 9, Align = TextAnchor.MiddleCenter }
                }, "Rpm_Nav");
            }

            // Tab Content Body
            container.Add(new CuiPanel
            {
                Image = { Color = "0 0 0 0" },
                RectTransform = { AnchorMin = "0.02 0.02", AnchorMax = "0.98 0.82" }
            }, CUI_MAIN, "Rpm_Body");

            if (currentTab == "players")
            {
                RenderPlayersTab(container, player);
            }
            else if (currentTab == "rates")
            {
                RenderRatesTab(container);
            }
            else if (currentTab == "god")
            {
                RenderGodToolsTab(container);
            }
            else if (currentTab == "techtree")
            {
                RenderTechTreeTab(container, player);
            }
            else if (currentTab == "automod")
            {
                RenderAutoModTab(container);
            }
            else if (currentTab == "panel")
            {
                RenderWebPanelTab(container);
            }

            CuiHelper.AddUi(player, container);
        }

        private void RenderPlayersTab(CuiElementContainer container, BasePlayer adminPlayer)
        {
            // Left Column: Player List Card Container
            container.Add(new CuiPanel
            {
                Image = { Color = "0.08 0.10 0.14 0.9" },
                RectTransform = { AnchorMin = "0 0", AnchorMax = "0.44 1" }
            }, "Rpm_Body", "Rpm_PlayerList");

            var allPlayers = new List<BasePlayer>();
            allPlayers.AddRange(BasePlayer.activePlayerList);
            foreach (var sleep in BasePlayer.sleepingPlayerList)
            {
                if (!allPlayers.Contains(sleep)) allPlayers.Add(sleep);
            }

            if (!activeSelectedPlayer.ContainsKey(adminPlayer.userID) && allPlayers.Count > 0)
            {
                activeSelectedPlayer[adminPlayer.userID] = allPlayers[0].userID;
            }

            ulong selectedId = activeSelectedPlayer.ContainsKey(adminPlayer.userID) ? activeSelectedPlayer[adminPlayer.userID] : 0;
            int curPage = activePage.ContainsKey(adminPlayer.userID) ? activePage[adminPlayer.userID] : 0;

            int perPage = 8;
            int totalPages = Mathf.CeilToInt((float)allPlayers.Count / perPage);
            if (curPage >= totalPages && totalPages > 0) curPage = totalPages - 1;

            // List Header Label
            container.Add(new CuiLabel
            {
                Text = { Text = $"<b><color=#8c96a5><size=10>ROSTER ({allPlayers.Count})</size></color></b>", FontSize = 10, Align = TextAnchor.MiddleLeft, Color = "1 1 1 1" },
                RectTransform = { AnchorMin = "0.04 0.93", AnchorMax = "0.96 0.98" }
            }, "Rpm_PlayerList");

            int startIndex = curPage * perPage;
            int displayCount = Math.Min(allPlayers.Count - startIndex, perPage);

            for (int i = 0; i < displayCount; i++)
            {
                var p = allPlayers[startIndex + i];
                float yMax = 0.91f - (i * 0.105f);
                float yMin = yMax - 0.095f;

                bool isSelected = p.userID == selectedId;
                string rowBg = isSelected ? "0.22 0.50 0.75 0.45" : "0.10 0.12 0.17 0.7";

                string statusDot = p.IsConnected ? "<color=#55c97b>●</color>" : p.IsSleeping() ? "<color=#f0ad4e>●</color>" : "<color=#666666>●</color>";
                string roleTag = p.net?.connection?.authLevel >= 2 ? " <color=#d9534f>[OWNER]</color>" : p.net?.connection?.authLevel == 1 ? " <color=#f0ad4e>[MOD]</color>" : "";
                string pName = p.displayName ?? "Rust Player";
                if (pName.Length > 15) pName = pName.Substring(0, 13) + "..";

                int hp = (int)Math.Round((double)p.health);

                container.Add(new CuiButton
                {
                    Button = { Command = $"rgpm.cui select {p.UserIDString}", Color = rowBg },
                    RectTransform = { AnchorMin = $"0.03 {yMin}", AnchorMax = $"0.97 {yMax}" },
                    Text = { Text = $" {statusDot} <b>{pName}</b>{roleTag} | <color=#55c97b>{hp} HP</color> | <color=#8c96a5>Grid {GetGridString(p.transform.position)}</color>", FontSize = 10, Align = TextAnchor.MiddleLeft, Color = "1 1 1 1" }
                }, "Rpm_PlayerList");
            }

            // Pagination Controls at bottom
            if (totalPages > 1)
            {
                container.Add(new CuiButton
                {
                    Button = { Command = $"rgpm.cui page {Math.Max(0, curPage - 1)}", Color = "0.12 0.15 0.20 0.8" },
                    RectTransform = { AnchorMin = "0.03 0.02", AnchorMax = "0.45 0.07" },
                    Text = { Text = "<b>◀ PREV</b>", FontSize = 9, Align = TextAnchor.MiddleCenter, Color = "0.7 0.75 0.85 1" }
                }, "Rpm_PlayerList");

                container.Add(new CuiButton
                {
                    Button = { Command = $"rgpm.cui page {Math.Min(totalPages - 1, curPage + 1)}", Color = "0.12 0.15 0.20 0.8" },
                    RectTransform = { AnchorMin = "0.55 0.02", AnchorMax = "0.97 0.07" },
                    Text = { Text = "<b>NEXT ▶</b>", FontSize = 9, Align = TextAnchor.MiddleCenter, Color = "0.7 0.75 0.85 1" }
                }, "Rpm_PlayerList");
            }

            // Right Column: Detailed Player Profile Inspector
            container.Add(new CuiPanel
            {
                Image = { Color = "0.08 0.10 0.14 0.9" },
                RectTransform = { AnchorMin = "0.46 0", AnchorMax = "1 1" }
            }, "Rpm_Body", "Rpm_PlayerDetail");

            var selPlayer = FindPlayer(selectedId);
            if (selPlayer != null)
            {
                // Top Identity Card
                container.Add(new CuiPanel
                {
                    Image = { Color = "0.10 0.12 0.18 0.8" },
                    RectTransform = { AnchorMin = "0.03 0.79", AnchorMax = "0.97 0.97" }
                }, "Rpm_PlayerDetail", "Rpm_DetailId");

                string statusPill = selPlayer.IsConnected ? "<color=#55c97b>[ONLINE]</color>" : selPlayer.IsSleeping() ? "<color=#f0ad4e>[SLEEPING]</color>" : "<color=#888888>[OFFLINE]</color>";
                bool isGod = serverGodmode || godmodePlayers.Contains(selPlayer.userID);
                string godPill = isGod ? " <color=#5ea4e0>[GODMODE]</color>" : "";

                container.Add(new CuiLabel
                {
                    Text = { Text = $"<b><size=14>{selPlayer.displayName}</size></b> {statusPill}{godPill}\n<color=#8c96a5><size=9>SteamID: {selPlayer.UserIDString}  |  Grid: {GetGridString(selPlayer.transform.position)}  |  Pos: {Math.Round((double)selPlayer.transform.position.x, 1)}, {Math.Round((double)selPlayer.transform.position.z, 1)}</size></color>", FontSize = 11, Align = TextAnchor.MiddleLeft, Color = "1 1 1 1" },
                    RectTransform = { AnchorMin = "0.04 0", AnchorMax = "0.96 1" }
                }, "Rpm_DetailId");

                // Vitals Mini-Matrix (5 Tile Cards)
                int hp = (int)Math.Round((double)selPlayer.health);
                int maxHp = (int)Math.Round((double)selPlayer.MaxHealth());
                int cal = selPlayer.metabolism != null ? (int)Math.Round((double)selPlayer.metabolism.calories.value) : 500;
                int hyd = selPlayer.metabolism != null ? (int)Math.Round((double)selPlayer.metabolism.hydration.value) : 250;
                int temp = selPlayer.metabolism != null ? (int)Math.Round((double)selPlayer.metabolism.temperature.value) : 20;
                int scrap = selPlayer.inventory != null ? selPlayer.inventory.GetAmount(ItemManager.FindItemDefinition("scrap")?.itemid ?? 0) : 0;

                string[] vitalsLabels = { $"HP: {hp}/{maxHp}", $"CAL: {cal}", $"HYD: {hyd}", $"TEMP: {temp}°C", $"SCRAP: {scrap}" };
                string[] vitalsColors = { "#55c97b", "#f0ad4e", "#5ea4e0", "#5ea4e0", "#f0ad4e" };

                for (int v = 0; v < 5; v++)
                {
                    float vXMin = 0.03f + (v * 0.19f);
                    float vXMax = vXMin + 0.175f;

                    container.Add(new CuiPanel
                    {
                        Image = { Color = "0.10 0.12 0.18 0.8" },
                        RectTransform = { AnchorMin = $"{vXMin} 0.69", AnchorMax = $"{vXMax} 0.77" }
                    }, "Rpm_PlayerDetail", $"Rpm_Vital_{v}");

                    container.Add(new CuiLabel
                    {
                        Text = { Text = $"<b><color={vitalsColors[v]}>{vitalsLabels[v]}</color></b>", FontSize = 9, Align = TextAnchor.MiddleCenter, Color = "1 1 1 1" },
                        RectTransform = { AnchorMin = "0 0", AnchorMax = "1 1" }
                    }, $"Rpm_Vital_{v}");
                }

                // Action Buttons Grid (2x4 Styled Rust Player Manager Buttons)
                string[] actions = { "heal", "feed", "godmode", "resurrect", "tp", "bring", "kill", "kick" };
                string[] labels = { "HEAL", "FEED", isGod ? "GODMODE (ON)" : "GODMODE", "REVIVE", "TELEPORT", "BRING", "KILL", "KICK" };
                string[] btnColors = {
                    "0.18 0.48 0.28 0.9", "0.55 0.40 0.15 0.9", isGod ? "0.65 0.22 0.22 0.9" : "0.32 0.30 0.50 0.9", "0.18 0.42 0.46 0.9",
                    "0.20 0.36 0.55 0.9", "0.18 0.46 0.50 0.9", "0.62 0.20 0.20 0.9", "0.68 0.22 0.22 0.9"
                };

                for (int j = 0; j < actions.Length; j++)
                {
                    int row = j / 2;
                    int col = j % 2;

                    float bXMin = col == 0 ? 0.03f : 0.51f;
                    float bXMax = col == 0 ? 0.49f : 0.97f;
                    float bYMax = 0.65f - (row * 0.13f);
                    float bYMin = bYMax - 0.105f;

                    container.Add(new CuiButton
                    {
                        Button = { Command = $"rgpm.cui action {selPlayer.UserIDString} {actions[j]}", Color = btnColors[j] },
                        RectTransform = { AnchorMin = $"{bXMin} {bYMin}", AnchorMax = $"{bXMax} {bYMax}" },
                        Text = { Text = $"<b>{labels[j]}</b>", FontSize = 10, Align = TextAnchor.MiddleCenter, Color = "1 1 1 1" }
                    }, "Rpm_PlayerDetail");
                }

                // Bottom Inventory & Stats Footnote Card
                int mainCount = selPlayer.inventory?.containerMain?.itemList?.Count ?? 0;
                int beltCount = selPlayer.inventory?.containerBelt?.itemList?.Count ?? 0;
                int wearCount = selPlayer.inventory?.containerWear?.itemList?.Count ?? 0;
                int bagCount = GetSleepingBags(selPlayer).Count;

                container.Add(new CuiPanel
                {
                    Image = { Color = "0.06 0.08 0.11 0.8" },
                    RectTransform = { AnchorMin = "0.03 0.03", AnchorMax = "0.97 0.11" }
                }, "Rpm_PlayerDetail", "Rpm_DetailFoot");

                container.Add(new CuiLabel
                {
                    Text = { Text = $"<b><color=#8c96a5>STORAGE:</color></b> Main: {mainCount}/24  |  Belt: {beltCount}/6  |  Wear: {wearCount}/8  |  Bags: <color=#5ea4e0>{bagCount}</color>\n<color=#5ea4e0>Use web panel for full live drag-and-drop item editor.</color>", FontSize = 9, Align = TextAnchor.MiddleCenter, Color = "0.75 0.80 0.90 1" },
                    RectTransform = { AnchorMin = "0 0", AnchorMax = "1 1" }
                }, "Rpm_DetailFoot");
            }
            else
            {
                container.Add(new CuiLabel
                {
                    Text = { Text = "<b><color=#8c96a5>Select a player from the roster list on the left to inspect.</color></b>", FontSize = 11, Align = TextAnchor.MiddleCenter, Color = "0.6 0.65 0.75 1" },
                    RectTransform = { AnchorMin = "0.1 0.4", AnchorMax = "0.9 0.6" }
                }, "Rpm_PlayerDetail");
            }
        }

        private void RenderRatesTab(CuiElementContainer container)
        {
            container.Add(new CuiPanel
            {
                Image = { Color = "0.08 0.10 0.14 0.9" },
                RectTransform = { AnchorMin = "0 0", AnchorMax = "1 1" }
            }, "Rpm_Body", "Rpm_RatesPanel");

            bool isEnabled = config.Rates != null && config.Rates.Enabled;
            float gRate = config.Rates?.Gather ?? 1f;
            float pRate = config.Rates?.Pickup ?? 1f;
            float lRate = config.Rates?.Loot ?? 1f;
            int sSize = config.Rates?.StackSize ?? 1;
            bool isInstantCraft = (config.Rates?.CraftingSpeed ?? 1f) >= 100f;

            string statusText = isEnabled ? "<color=#10b981><b>ACTIVE</b></color>" : "<color=#ef4444><b>DISABLED</b></color>";
            string info = $"<b><color=#38bdf8><size=13>SERVER RATES & MULTIPLIERS CONTROLLER</size></color></b>\n" +
                          $"<color=#8c96a5><size=9>Status: {statusText}  |  Gather: <color=#ffffff>{gRate}x</color>  |  Pickup: <color=#ffffff>{pRate}x</color>  |  Loot: <color=#ffffff>{lRate}x</color>  |  Stack Size: <color=#ffffff>{sSize}x</color></size></color>";

            container.Add(new CuiLabel
            {
                Text = { Text = info, FontSize = 11, Align = TextAnchor.UpperLeft, Color = "1 1 1 1" },
                RectTransform = { AnchorMin = "0.03 0.88", AnchorMax = "0.97 0.98" }
            }, "Rpm_RatesPanel");

            // Master Toggle Button
            string toggleBtnColor = isEnabled ? "0.62 0.20 0.20 0.9" : "0.18 0.48 0.28 0.9";
            string toggleBtnText = isEnabled ? "DISABLE RATES ENGINE" : "ENABLE RATES ENGINE";

            container.Add(new CuiButton
            {
                Button = { Command = "rgpm.cui rates toggle", Color = toggleBtnColor },
                RectTransform = { AnchorMin = "0.03 0.76", AnchorMax = "0.48 0.85" },
                Text = { Text = $"<b>{toggleBtnText}</b>", FontSize = 10, Align = TextAnchor.MiddleCenter, Color = "1 1 1 1" }
            }, "Rpm_RatesPanel");

            // Instant Craft Toggle Button
            string craftBtnColor = isInstantCraft ? "0.18 0.48 0.28 0.9" : "0.20 0.36 0.55 0.9";
            string craftBtnText = isInstantCraft ? "INSTANT CRAFT: ON" : "INSTANT CRAFT: OFF";

            container.Add(new CuiButton
            {
                Button = { Command = "rgpm.cui rates instantcraft", Color = craftBtnColor },
                RectTransform = { AnchorMin = "0.52 0.76", AnchorMax = "0.97 0.85" },
                Text = { Text = $"<b>{craftBtnText}</b>", FontSize = 10, Align = TextAnchor.MiddleCenter, Color = "1 1 1 1" }
            }, "Rpm_RatesPanel");

            // Quick Presets Label
            container.Add(new CuiLabel
            {
                Text = { Text = "<b><color=#8c96a5><size=10>1-CLICK RATE PRESETS (APPLIES GATHER, PICKUP, LOOT & STACK SIZES)</size></color></b>", FontSize = 10, Align = TextAnchor.MiddleLeft, Color = "1 1 1 1" },
                RectTransform = { AnchorMin = "0.03 0.68", AnchorMax = "0.97 0.73" }
            }, "Rpm_RatesPanel");

            // Preset Grid
            float[] presetValues = { 1f, 2f, 5f, 10f, 100f, 1000f, 10000f, 100000f };
            string[] presetLabels = { "1x Vanilla", "2x Modded", "5x Boosted", "10x High", "100x Mega", "1,000x Ultra", "10,000x Insane", "100,000x Extreme" };
            string[] presetColors = {
                "0.12 0.15 0.20 0.85", "0.14 0.20 0.28 0.85", "0.16 0.24 0.34 0.85", "0.18 0.28 0.40 0.85",
                "0.20 0.32 0.46 0.85", "0.22 0.38 0.55 0.85", "0.24 0.44 0.65 0.85", "0.18 0.48 0.28 0.9"
            };

            for (int i = 0; i < presetValues.Length; i++)
            {
                int row = i / 4;
                int col = i % 4;

                float xMin = 0.03f + (col * 0.242f);
                float xMax = xMin + 0.23f;
                float yMax = 0.65f - (row * 0.16f);
                float yMin = yMax - 0.13f;

                float val = presetValues[i];
                bool isSelected = Math.Abs(gRate - val) < 0.1f;
                string btnBg = isSelected ? "0.22 0.50 0.75 0.95" : presetColors[i];

                container.Add(new CuiButton
                {
                    Button = { Command = $"rgpm.cui rates preset {val}", Color = btnBg },
                    RectTransform = { AnchorMin = $"{xMin} {yMin}", AnchorMax = $"{xMax} {yMax}" },
                    Text = { Text = $"<b>{presetLabels[i]}</b>", FontSize = 10, Align = TextAnchor.MiddleCenter, Color = "1 1 1 1" }
                }, "Rpm_RatesPanel");
            }

            // Footnote Card
            container.Add(new CuiPanel
            {
                Image = { Color = "0.06 0.08 0.11 0.8" },
                RectTransform = { AnchorMin = "0.03 0.04", AnchorMax = "0.97 0.26" }
            }, "Rpm_RatesPanel", "Rpm_RatesFoot");

            string footText = "<b><size=11>GRANULAR ITEM CATEGORY STACKS IN WEB PANEL</size></b>\n\n" +
                              "• Configure custom per-category stack size multipliers (Ammunition, Resources, Medical, Components).\n" +
                              "• Fine-tune furnace smelting speed, recycler speed, and individual mining quarry rates.\n" +
                              "• Instant live hot-reloading with zero server restarts required.\n\n" +
                              "<color=#38bdf8>Open Rust Player Manager in your web browser for full granular control.</color>";

            container.Add(new CuiLabel
            {
                Text = { Text = footText, FontSize = 9, Align = TextAnchor.UpperLeft, Color = "0.80 0.85 0.92 1" },
                RectTransform = { AnchorMin = "0.03 0.08", AnchorMax = "0.97 0.92" }
            }, "Rpm_RatesFoot");
        }

        private void RenderGodToolsTab(CuiElementContainer container)
        {
            container.Add(new CuiPanel
            {
                Image = { Color = "0.08 0.10 0.14 0.9" },
                RectTransform = { AnchorMin = "0 0", AnchorMax = "1 1" }
            }, "Rpm_Body", "Rpm_GodPanel");

            container.Add(new CuiLabel
            {
                Text = { Text = "<b><color=#38bdf8><size=13>SERVER MANAGEMENT & DISPATCH TOOLS</size></color></b>\n<color=#8c96a5><size=9>Execute server-wide actions, events, and environmental parameters</size></color>", FontSize = 11, Align = TextAnchor.UpperLeft, Color = "1 1 1 1" },
                RectTransform = { AnchorMin = "0.03 0.88", AnchorMax = "0.97 0.98" }
            }, "Rpm_GodPanel");

            string[] godActions = {
                "healall", "feedall", "godall", "killsleepers",
                "airdrop", "heli", "cargoship", "day",
                "night", "weather_clear", "weather_storm"
            };

            string[] godLabels = {
                "HEAL ALL PLAYERS", "FEED ALL PLAYERS", $"SERVER GODMODE ({(serverGodmode ? "ON" : "OFF")})", "KILL ALL SLEEPERS",
                "CALL SUPPLY DROP", "CALL PATROL HELI", "CALL CARGO SHIP", "SET TIME: DAY (12:00)",
                "SET TIME: NIGHT (00:00)", "SET CLEAR WEATHER", "SET STORM WEATHER"
            };

            string[] godColors = {
                "0.18 0.48 0.28 0.9", "0.55 0.40 0.15 0.9", serverGodmode ? "0.65 0.22 0.22 0.9" : "0.32 0.30 0.50 0.9", "0.62 0.20 0.20 0.9",
                "0.55 0.42 0.16 0.9", "0.60 0.25 0.25 0.9", "0.20 0.40 0.55 0.9", "0.55 0.48 0.16 0.9",
                "0.18 0.25 0.45 0.9", "0.18 0.48 0.40 0.9", "0.38 0.28 0.52 0.9"
            };

            for (int i = 0; i < godActions.Length; i++)
            {
                int row = i / 3;
                int col = i % 3;

                float xMin = 0.03f + (col * 0.325f);
                float xMax = xMin + 0.31f;
                float yMax = 0.82f - (row * 0.185f);
                float yMin = yMax - 0.145f;

                container.Add(new CuiButton
                {
                    Button = { Command = $"rgpm.cui god {godActions[i]}", Color = godColors[i] },
                    RectTransform = { AnchorMin = $"{xMin} {yMin}", AnchorMax = $"{xMax} {yMax}" },
                    Text = { Text = $"<b>{godLabels[i]}</b>", FontSize = 10, Align = TextAnchor.MiddleCenter, Color = "1 1 1 1" }
                }, "Rpm_GodPanel");
            }
        }

        private void RenderTechTreeTab(CuiElementContainer container, BasePlayer adminPlayer)
        {
            container.Add(new CuiPanel
            {
                Image = { Color = "0.08 0.10 0.14 0.9" },
                RectTransform = { AnchorMin = "0 0", AnchorMax = "1 1" }
            }, "Rpm_Body", "Rpm_TechPanel");

            ulong selectedId = activeSelectedPlayer.ContainsKey(adminPlayer.userID) ? activeSelectedPlayer[adminPlayer.userID] : adminPlayer.userID;
            var target = FindPlayer(selectedId);
            string targetName = target != null ? target.displayName : "Selected Player";

            container.Add(new CuiLabel
            {
                Text = { Text = $"<b><color=#38bdf8><size=13>WORKBENCH TECH TREE CONTROLS</size></color></b>\n<color=#8c96a5><size=9>Manage blueprint unlocks for player: <b><color=#ffffff>{targetName}</color></b></size></color>", FontSize = 11, Align = TextAnchor.UpperLeft, Color = "1 1 1 1" },
                RectTransform = { AnchorMin = "0.03 0.88", AnchorMax = "0.97 0.98" }
            }, "Rpm_TechPanel");

            // Tier research action buttons
            container.Add(new CuiButton
            {
                Button = { Command = $"rgpm.cui techtree {selectedId} unlockall", Color = "0.18 0.48 0.28 0.9" },
                RectTransform = { AnchorMin = "0.05 0.62", AnchorMax = "0.48 0.76" },
                Text = { Text = "<b>UNLOCK ALL BLUEPRINTS</b>\n<size=8>Instantly unlocks WB1, WB2, WB3 & Industrial tiers</size>", FontSize = 10, Align = TextAnchor.MiddleCenter, Color = "1 1 1 1" }
            }, "Rpm_TechPanel");

            container.Add(new CuiButton
            {
                Button = { Command = $"rgpm.cui techtree {selectedId} reset", Color = "0.62 0.20 0.20 0.9" },
                RectTransform = { AnchorMin = "0.52 0.62", AnchorMax = "0.95 0.76" },
                Text = { Text = "<b>RESET BLUEPRINTS</b>\n<size=8>Locks all tech tree tiers back to default</size>", FontSize = 10, Align = TextAnchor.MiddleCenter, Color = "1 1 1 1" }
            }, "Rpm_TechPanel");

            // Info Card
            container.Add(new CuiPanel
            {
                Image = { Color = "0.10 0.12 0.18 0.8" },
                RectTransform = { AnchorMin = "0.05 0.15", AnchorMax = "0.95 0.55" }
            }, "Rpm_TechPanel", "Rpm_TechInfo");

            string ttInfo = "<b><size=11>VISUAL TECH TREE IN WEB PANEL</size></b>\n\n" +
                            "• Open <b>Rust Player Manager</b> in your browser for the full interactive visual node graph.\n" +
                            "• Inspect individual blueprints (Weapons, Armor, Explosives, Electrical) with scrap costs.\n" +
                            "• Single blueprint toggle and lock/unlock synchronization.\n\n" +
                            "<color=#38bdf8>Visit your web panel to use the interactive Tech Tree viewer.</color>";

            container.Add(new CuiLabel
            {
                Text = { Text = ttInfo, FontSize = 10, Align = TextAnchor.UpperLeft, Color = "0.85 0.90 0.95 1" },
                RectTransform = { AnchorMin = "0.04 0.08", AnchorMax = "0.96 0.92" }
            }, "Rpm_TechInfo");
        }

        private void RenderAutoModTab(CuiElementContainer container)
        {
            container.Add(new CuiPanel
            {
                Image = { Color = "0.08 0.10 0.14 0.9" },
                RectTransform = { AnchorMin = "0 0", AnchorMax = "1 1" }
            }, "Rpm_Body", "Rpm_AutoModPanel");

            bool isEnabled = config.AutoMod != null && config.AutoMod.Enabled;
            string action = config.AutoMod?.Action ?? "warn";
            int count = config.AutoMod?.BannedWords?.Count ?? 0;

            string info = $"<b><color=#38bdf8><size=13>AUTOMATED CHAT MODERATION</size></color></b>\n\n" +
                          $"• Status: {(isEnabled ? "<color=#55c97b><b>ENABLED</b></color>" : "<color=#d9534f><b>DISABLED</b></color>")}\n" +
                          $"• Action on Trigger: <color=#f0ad4e><b>{action.ToUpper()}</b></color>\n" +
                          $"• Blacklisted Words: <color=#38bdf8><b>{count}</b></color>\n\n" +
                          $"<color=#8c96a5>Configure word filters, threshold actions, and moderation logs via the web panel.</color>";

            container.Add(new CuiLabel
            {
                Text = { Text = info, FontSize = 10, Align = TextAnchor.UpperLeft, Color = "1 1 1 1" },
                RectTransform = { AnchorMin = "0.05 0.40", AnchorMax = "0.95 0.92" }
            }, "Rpm_AutoModPanel");
        }

        private void RenderWebPanelTab(CuiElementContainer container)
        {
            container.Add(new CuiPanel
            {
                Image = { Color = "0.08 0.10 0.14 0.9" },
                RectTransform = { AnchorMin = "0 0", AnchorMax = "1 1" }
            }, "Rpm_Body", "Rpm_WebPanel");

            string panelUrl = !string.IsNullOrEmpty(config.PanelUrl) ? config.PanelUrl.TrimEnd('/') : "%%PANEL_URL%%";
            string serverUuid = !string.IsNullOrEmpty(config.ServerUuid) ? config.ServerUuid : "%%SERVER_UUID%%";
            string fullUrl = !string.IsNullOrEmpty(serverUuid) ? $"{panelUrl}/server/{serverUuid}/rust-players" : panelUrl;

            string text = $"<b><color=#38bdf8><size=14>CENTRIX RUST MANAGER DASHBOARD</size></color></b>\n\n" +
                          $"Access the web management suite from any desktop or mobile browser:\n" +
                          $"• Full visual inventory editor (Main, Belt, Wear) with item spawner\n" +
                          $"• Tool Cupboard upkeep inspector and decay timer\n" +
                          $"• Multipliers and rates engine with up to 100,000x gather\n" +
                          $"• Interactive Workbench Tech Tree graph (WB1, WB2, WB3, Engineering)\n" +
                          $"• Scheduled wipes with custom seeds and RCON countdown alerts\n" +
                          $"• Real-time server telemetry and player moderation logs\n\n" +
                          $"<b>Dashboard URL:</b>\n<color=#38bdf8><size=11>{fullUrl}</size></color>";

            container.Add(new CuiLabel
            {
                Text = { Text = text, FontSize = 10, Align = TextAnchor.UpperLeft, Color = "1 1 1 1" },
                RectTransform = { AnchorMin = "0.05 0.10", AnchorMax = "0.95 0.92" }
            }, "Rpm_WebPanel");
        }

        private void OpenPlayerPanelUI(BasePlayer player)
        {
            if (player == null) return;

            CuiHelper.DestroyUi(player, CUI_PANEL);

            var container = new CuiElementContainer();

            container.Add(new CuiPanel
            {
                Image = { Color = "0.07 0.08 0.11 0.97", Material = "assets/content/ui/uibackgroundblur.mat" },
                RectTransform = { AnchorMin = "0.25 0.22", AnchorMax = "0.75 0.78" },
                CursorEnabled = true
            }, "Overlay", CUI_PANEL);

            // Header
            container.Add(new CuiPanel
            {
                Image = { Color = "0.09 0.11 0.15 0.98" },
                RectTransform = { AnchorMin = "0 0.88", AnchorMax = "1 1" }
            }, CUI_PANEL, "Rpm_PHeader");

            container.Add(new CuiLabel
            {
                Text = { Text = $"<b><color=#38bdf8>CENTRIX</color> <color=#ffffff>{config.ServerName.ToUpper()}</color></b> | <color=#8c96a5>Player Info</color>", FontSize = 11, Align = TextAnchor.MiddleLeft, Color = "1 1 1 1" },
                RectTransform = { AnchorMin = "0.04 0", AnchorMax = "0.85 1" }
            }, "Rpm_PHeader");

            container.Add(new CuiButton
            {
                Button = { Command = "rgpm.cui close", Color = "0.62 0.20 0.20 0.85" },
                RectTransform = { AnchorMin = "0.91 0.18", AnchorMax = "0.97 0.82" },
                Text = { Text = "<b>✕</b>", FontSize = 11, Align = TextAnchor.MiddleCenter, Color = "1 1 1 1" }
            }, "Rpm_PHeader");

            string info = $"Welcome, <b><color=#38bdf8>{player.displayName}</color></b>!\n\n" +
                          $"• SteamID: <color=#ffffff>{player.UserIDString}</color>\n" +
                          $"• Current Grid: <color=#55c97b>{GetGridString(player.transform.position)}</color>\n" +
                          $"• Health: <color=#55c97b>{(int)Math.Round((double)player.health)}/{(int)Math.Round((double)player.MaxHealth())}</color>\n" +
                          $"• Online Players: <color=#38bdf8>{BasePlayer.activePlayerList.Count}/{ConVar.Server.maxplayers}</color>\n";

            if (!string.IsNullOrEmpty(config.DiscordUrl))
            {
                info += $"\n• Discord: <color=#38bdf8>{config.DiscordUrl}</color>\n";
            }

            info += "\n<color=#8c96a5>Powered by Rust Player Manager.</color>";

            container.Add(new CuiLabel
            {
                Text = { Text = info, FontSize = 10, Align = TextAnchor.UpperLeft, Color = "0.85 0.90 0.95 1" },
                RectTransform = { AnchorMin = "0.06 0.12", AnchorMax = "0.94 0.84" }
            }, CUI_PANEL);

            CuiHelper.AddUi(player, container);
        }

        #endregion

        #region Data Export

        public void ExportState()
        {
            EnsureDirectories();
            try
            {
                var list = new List<object>();
                var seenIds = new HashSet<ulong>();

                // Active online players (lightweight summary)
                foreach (var p in BasePlayer.activePlayerList)
                {
                    if (p == null) continue;
                    seenIds.Add(p.userID);
                    try
                    {
                        var playerEntry = BuildPlayerSummary(p);
                        if (playerEntry != null) list.Add(playerEntry);
                    }
                    catch {}
                }

                // Sleeping players (lightweight summary)
                foreach (var p in BasePlayer.sleepingPlayerList)
                {
                    if (p == null || seenIds.Contains(p.userID)) continue;
                    seenIds.Add(p.userID);
                    try
                    {
                        var playerEntry = BuildPlayerSummary(p);
                        if (playerEntry != null) list.Add(playerEntry);
                    }
                    catch {}
                }

                var bansList = new List<object>();
                try
                {
                    var bannedUsers = ServerUsers.GetAll(ServerUsers.UserGroup.Banned);
                    if (bannedUsers != null)
                    {
                        foreach (var b in bannedUsers)
                        {
                            if (b == null) continue;
                            bansList.Add(new
                            {
                                steamId = b.steamid.ToString(),
                                name = string.IsNullOrEmpty(b.username) ? "Banned Player" : b.username,
                                reason = string.IsNullOrEmpty(b.notes) ? "Violating server rules" : b.notes,
                                expiry = b.expiry,
                                isPermanent = b.expiry <= 0 || b.expiry == -1L
                            });
                        }
                    }
                }
                catch {}

                var metrics = new
                {
                    fps = (int)Math.Round((double)Performance.current.frameRate),
                    ents = BaseNetworkable.serverEntities != null ? BaseNetworkable.serverEntities.Count : 0,
                    players = BasePlayer.activePlayerList.Count,
                    sleeping = BasePlayer.sleepingPlayerList.Count,
                    maxPlayers = ConVar.Server.maxplayers,
                    uptime = (int)Time.realtimeSinceStartup,
                    serverGodmode = serverGodmode
                };

                // World & Environment parameters
                float wSize = ConVar.Server.worldsize > 0 ? ConVar.Server.worldsize : 4000f;
                int wSeed = ConVar.Server.seed > 0 ? ConVar.Server.seed : 12345;
                string wLevel = ConVar.Server.level ?? "Procedural Map";
                double envTime = TOD_Sky.Instance != null ? Math.Round((double)TOD_Sky.Instance.Cycle.Hour, 2) : 12.0;

                var monuments = GetMonuments();
                var bases = GetAllToolCupboards();
                var events = GetLiveWorldEvents();

                var payload = new
                {
                    ok = true,
                    timestamp = (int)DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                    worldSize = (int)wSize,
                    seed = wSeed,
                    level = wLevel,
                    envTime = envTime,
                    metrics = metrics,
                    players = list,
                    monuments = monuments,
                    bases = bases,
                    events = events,
                    combat = recentCombatEvents,
                    kills = recentKills,
                    explosions = recentExplosions,
                    bans = bansList,
                    rates = config?.Rates,
                    automod = config?.AutoMod
                };

                try
                {
                    Interface.Oxide.DataFileSystem.WriteObject("RustPlayerBridge/state", payload);
                }
                catch {}
            }
            catch (Exception ex)
            {
                Puts($"[RustPlayerBridge] ExportState error: {ex.Message}");
            }
        }

        private object BuildPlayerSummary(BasePlayer player)
        {
            if (player == null) return null;
            var pos = player.transform != null ? player.transform.position : Vector3.zero;

            bool isGod = serverGodmode || godmodePlayers.Contains(player.userID);
            bool isFrozen = frozenPlayers.Contains(player.userID);
            var serverUser = ServerUsers.Get(player.userID);
            bool isBanned = serverUser != null && serverUser.group == ServerUsers.UserGroup.Banned;

            bool isOwner = (player.net?.connection != null && player.net.connection.authLevel >= 2)
                        || (serverUser != null && serverUser.group == ServerUsers.UserGroup.Owner)
                        || player.IsAdmin;
            bool isModerator = (player.net?.connection != null && player.net.connection.authLevel == 1)
                        || (serverUser != null && serverUser.group == ServerUsers.UserGroup.Moderator);

            bool isConn = (player.net?.connection != null) || (player.IsConnected && BasePlayer.activePlayerList.Contains(player));
            bool isSleep = player.IsSleeping() || (BasePlayer.sleepingPlayerList.Contains(player) && !isConn);

            float yaw = 0f;
            try
            {
                yaw = player.eyes != null ? player.eyes.rotation.eulerAngles.y : (player.transform != null ? player.transform.eulerAngles.y : 0f);
            }
            catch {}

            int maxHp = 100;
            try
            {
                maxHp = (int)Math.Round((double)player.MaxHealth());
            }
            catch {}

            int pingVal = 0;
            try
            {
                pingVal = covalence.Players.FindPlayerById(player.UserIDString)?.Ping ?? 0;
            }
            catch {}

            return new
            {
                steamId = player.UserIDString,
                name = player.displayName ?? "Unknown",
                health = (int)Math.Round((double)player.health),
                maxHealth = maxHp,
                calories = player.metabolism != null ? (int)Math.Round((double)player.metabolism.calories.value) : 500,
                hydration = player.metabolism != null ? (int)Math.Round((double)player.metabolism.hydration.value) : 250,
                ping = pingVal,
                ip = player.net?.connection != null ? player.net.connection.ipaddress : "127.0.0.1",
                isConnected = isConn,
                isSleeping = isSleep,
                isDead = player.IsDead() || player.health <= 0f,
                isWounded = player.IsWounded(),
                isGod = isGod,
                isFrozen = isFrozen,
                isOwner = isOwner,
                isModerator = isModerator,
                isBanned = isBanned,
                teamId = (int)(player.currentTeam),
                rotation = Math.Round((double)yaw, 1),
                grid = GetGridString(pos),
                pos = new { x = Math.Round((double)pos.x, 2), y = Math.Round((double)pos.y, 2), z = Math.Round((double)pos.z, 2) },
            };
        }

        public void ExportPlayer(BasePlayer player)
        {
            if (player == null) return;
            EnsureDirectories();

            try
            {
                var payload = BuildPlayerPayload(player);
                string filename = $"RustPlayerBridge/players/{player.UserIDString}";
                Interface.Oxide.DataFileSystem.WriteObject(filename, payload);
            }
            catch (Exception ex)
            {
                Puts($"[RustPlayerBridge] ExportPlayer error for {player.UserIDString}: {ex.Message}");
            }
        }

        private object BuildPlayerPayload(BasePlayer player)
        {
            if (player == null) return null;
            var inv = player.inventory;
            var pos = player.transform != null ? player.transform.position : Vector3.zero;

            var bags = GetSleepingBags(player);
            var tcs = GetToolCupboards(player);
            var bps = GetUnlockedBlueprints(player);

            bool isGod = serverGodmode || godmodePlayers.Contains(player.userID);
            bool isFrozen = frozenPlayers.Contains(player.userID);
            var serverUser = ServerUsers.Get(player.userID);
            bool isBanned = serverUser != null && serverUser.group == ServerUsers.UserGroup.Banned;

            bool isOwner = (player.net?.connection != null && player.net.connection.authLevel >= 2)
                        || (serverUser != null && serverUser.group == ServerUsers.UserGroup.Owner)
                        || player.IsAdmin;
            bool isModerator = (player.net?.connection != null && player.net.connection.authLevel == 1)
                        || (serverUser != null && serverUser.group == ServerUsers.UserGroup.Moderator);

            bool isConn = (player.net?.connection != null) || (player.IsConnected && BasePlayer.activePlayerList.Contains(player));
            bool isSleep = player.IsSleeping() || (BasePlayer.sleepingPlayerList.Contains(player) && !isConn);

            float yaw = 0f;
            try
            {
                yaw = player.eyes != null ? player.eyes.rotation.eulerAngles.y : (player.transform != null ? player.transform.eulerAngles.y : 0f);
            }
            catch {}

            int maxHp = 100;
            try
            {
                maxHp = (int)Math.Round((double)player.MaxHealth());
            }
            catch {}

            int scrapCount = 0;
            try
            {
                if (inv != null)
                {
                    var scrapDef = ItemManager.FindItemDefinition("scrap");
                    if (scrapDef != null)
                    {
                        scrapCount = inv.GetAmount(scrapDef.itemid);
                    }
                }
            }
            catch {}

            int pingVal = 0;
            try
            {
                pingVal = covalence.Players.FindPlayerById(player.UserIDString)?.Ping ?? 0;
            }
            catch {}

            return new
            {
                ok = true,
                steamId = player.UserIDString,
                name = player.displayName ?? "Unknown",
                health = (int)Math.Round((double)player.health),
                maxHealth = maxHp,
                calories = player.metabolism != null ? (int)Math.Round((double)player.metabolism.calories.value) : 500,
                hydration = player.metabolism != null ? (int)Math.Round((double)player.metabolism.hydration.value) : 250,
                temperature = player.metabolism != null ? (int)Math.Round((double)player.metabolism.temperature.value) : 20,
                radiation = player.metabolism != null ? (int)Math.Round((double)player.metabolism.radiation_poison.value) : 0,
                scrap = scrapCount,
                ping = pingVal,
                ip = player.net?.connection != null ? player.net.connection.ipaddress : "127.0.0.1",
                isConnected = isConn,
                isSleeping = isSleep,
                isDead = player.IsDead() || player.health <= 0f,
                isWounded = player.IsWounded(),
                isGod = isGod,
                isFrozen = isFrozen,
                isOwner = isOwner,
                isModerator = isModerator,
                isBanned = isBanned,
                teamId = (int)(player.currentTeam),
                rotation = Math.Round((double)yaw, 1),
                grid = GetGridString(pos),
                pos = new { x = Math.Round((double)pos.x, 2), y = Math.Round((double)pos.y, 2), z = Math.Round((double)pos.z, 2) },
                inventory = new
                {
                    main = DumpContainer(inv?.containerMain),
                    belt = DumpContainer(inv?.containerBelt),
                    wear = DumpContainer(inv?.containerWear)
                },
                sleepingBags = bags,
                toolCupboards = tcs,
                blueprints = bps,
                notes = ""
            };
        }

        private List<object> GetMonuments()
        {
            if (cachedMonuments != null && cachedMonuments.Count > 0)
            {
                return cachedMonuments;
            }

            var list = new List<object>();
            try
            {
                var seenPositions = new HashSet<string>();

                if (TerrainMeta.Path != null && TerrainMeta.Path.Monuments != null)
                {
                    foreach (var m in TerrainMeta.Path.Monuments)
                    {
                        if (m == null) continue;
                        string rawName = m.name ?? m.displayPhrase.english ?? "Monument";
                        string cleanName = CleanMonumentName(rawName);
                        if (string.IsNullOrEmpty(cleanName)) continue;

                        var pos = m.transform.position;
                        string posKey = $"{Math.Round((double)pos.x / 50)},{Math.Round((double)pos.z / 50)}";
                        if (seenPositions.Contains(posKey)) continue;
                        seenPositions.Add(posKey);

                        list.Add(new
                        {
                            name = cleanName,
                            rawName = rawName,
                            grid = GetGridString(pos),
                            pos = new { x = Math.Round((double)pos.x, 1), y = Math.Round((double)pos.y, 1), z = Math.Round((double)pos.z, 1) },
                            tier = GetMonumentTier(cleanName),
                            isSafezone = IsSafezoneMonument(cleanName),
                            hasRad = cleanName.Contains("Launch") || cleanName.Contains("Military") || cleanName.Contains("Power") || cleanName.Contains("Nuclear") || cleanName.Contains("Train Yard")
                        });
                    }
                }

                if (list.Count == 0)
                {
                    var monuments = UnityEngine.Object.FindObjectsOfType<MonumentInfo>();
                    if (monuments != null)
                    {
                        foreach (var m in monuments)
                        {
                            if (m == null) continue;
                            string rawName = m.name ?? (m.displayPhrase != null ? m.displayPhrase.english : null) ?? "Monument";
                            string cleanName = CleanMonumentName(rawName);
                            if (string.IsNullOrEmpty(cleanName)) continue;

                            var pos = m.transform.position;
                            string posKey = $"{Math.Round((double)pos.x / 50)},{Math.Round((double)pos.z / 50)}";
                            if (seenPositions.Contains(posKey)) continue;
                            seenPositions.Add(posKey);

                            list.Add(new
                            {
                                name = cleanName,
                                rawName = rawName,
                                grid = GetGridString(pos),
                                pos = new { x = Math.Round((double)pos.x, 1), y = Math.Round((double)pos.y, 1), z = Math.Round((double)pos.z, 1) },
                                tier = GetMonumentTier(cleanName),
                                isSafezone = IsSafezoneMonument(cleanName),
                                hasRad = cleanName.Contains("Launch") || cleanName.Contains("Military") || cleanName.Contains("Power") || cleanName.Contains("Nuclear") || cleanName.Contains("Train Yard")
                            });
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Puts($"[RustPlayerBridge] GetMonuments error: {ex.Message}");
            }

            cachedMonuments = list;
            return list;
        }

        private string CleanMonumentName(string raw)
        {
            if (string.IsNullOrEmpty(raw)) return "";
            string lower = raw.ToLowerInvariant();

            // Skip minor clutter: caves, tiny wells, bunkers/tunnel entrances, swamps, ruins, ice lakes, powerlines, roads
            if (lower.Contains("/cave/") || lower.Contains("cave_") || lower.Contains("/tiny/") || lower.Contains("water_well")
                || lower.Contains("tunnel-entrance") || lower.Contains("entrance_bunker") || lower.Contains("swamp")
                || lower.Contains("jungle_ruins") || lower.Contains("jungle_ziggurat") || lower.Contains("ice_lake")
                || lower.Contains("powerline") || lower.Contains("road") || lower.Contains("substation") || lower.Contains("canyon")
                || lower.Contains("iceberg") || lower.Contains("cliff") || lower.Contains("underwater_lab"))
            {
                return "";
            }

            if (lower.Contains("launch_site") || lower.Contains("launchsite")) return "Launch Site";
            if (lower.Contains("military_tunnel")) return "Military Tunnel";
            if (lower.Contains("oilrig_1") || lower.Contains("largeoilrig") || lower.Contains("oilrig_large")) return "Large Oil Rig";
            if (lower.Contains("oilrig_2") || lower.Contains("smalloilrig") || lower.Contains("oilrig_small") || lower.Contains("oilrig")) return "Small Oil Rig";
            if (lower.Contains("airfield")) return "Airfield";
            if (lower.Contains("sphere_tank") || lower.Contains("the_dome") || lower.Contains("dome")) return "The Dome";
            if (lower.Contains("compound") || lower.Contains("outpost")) return "Outpost";
            if (lower.Contains("bandit_town") || lower.Contains("bandit_camp") || lower.Contains("banditcamp")) return "Bandit Camp";
            if (lower.Contains("excavator")) return "Giant Excavator";
            if (lower.Contains("powerplant") || lower.Contains("power_plant")) return "Power Plant";
            if (lower.Contains("water_treatment")) return "Water Treatment";
            if (lower.Contains("trainyard") || lower.Contains("train_yard")) return "Train Yard";
            if (lower.Contains("satellite_dish")) return "Satellite Dish";
            if (lower.Contains("harbor_1")) return "Harbor 1";
            if (lower.Contains("harbor_2")) return "Harbor 2";
            if (lower.Contains("ferry_terminal")) return "Ferry Terminal";
            if (lower.Contains("harbor")) return "Harbor";
            if (lower.Contains("sewer") || lower.Contains("radtown_small_3")) return "Sewer Branch";
            if (lower.Contains("apartments_complex") || lower.Contains("radtown")) return "Radtown";
            if (lower.Contains("lighthouse")) return "Lighthouse";
            if (lower.Contains("supermarket")) return "Supermarket";
            if (lower.Contains("gas_station") || lower.Contains("oxum")) return "Oxum's Gas Station";
            if (lower.Contains("fishing_village_a") || lower.Contains("fishing_village_b") || lower.Contains("fishing_village_c") || lower.Contains("fishing_village")) return "Fishing Village";
            if (lower.Contains("stables_b") || lower.Contains("large_barn") || lower.Contains("barn")) return "Large Barn";
            if (lower.Contains("stables_a") || lower.Contains("stables") || lower.Contains("ranch")) return "Ranch / Stables";
            if (lower.Contains("mining_quarry_a")) return "Sulfur Quarry";
            if (lower.Contains("mining_quarry_b")) return "Stone Quarry";
            if (lower.Contains("mining_quarry_c")) return "HQM Quarry";
            if (lower.Contains("mining_quarry") || lower.Contains("quarry")) return "Mining Quarry";
            if (lower.Contains("nuclear_missile_silo") || lower.Contains("missile_silo") || lower.Contains("silo")) return "Missile Silo";
            if (lower.Contains("arctic_research_base") || lower.Contains("arctic_bases") || lower.Contains("arctic")) return "Arctic Research Base";
            if (lower.Contains("desert_military_base") || lower.Contains("military_base")) return "Desert Military Base";
            if (lower.Contains("junkyard")) return "Junkyard";
            if (lower.Contains("abandoned_cabins") || lower.Contains("cabins")) return "Abandoned Cabins";

            // If it still contains a file path, discard it
            if (lower.StartsWith("assets/") || lower.Contains("prefab") || lower.Contains("/")) return "";

            return raw.Replace("_", " ");
        }

        private bool IsSafezoneMonument(string name)
        {
            return name == "Outpost" || name == "Bandit Camp" || name == "Fishing Village" || name == "Ranch / Stables" || name == "Large Barn" || name == "Ferry Terminal";
        }

        private int GetMonumentTier(string name)
        {
            if (name == "Launch Site" || name == "Military Tunnel" || name == "Large Oil Rig" || name == "Missile Silo" || name == "Giant Excavator") return 3;
            if (name == "Small Oil Rig" || name == "Airfield" || name == "Water Treatment" || name == "Train Yard" || name == "Power Plant" || name == "Arctic Research Base") return 2;
            if (name == "The Dome" || name == "Satellite Dish" || name == "Sewer Branch" || name == "Harbor 1" || name == "Harbor 2" || name == "Harbor" || name == "Junkyard" || name == "Stone Quarry" || name == "HQM Quarry" || name == "Sulfur Quarry" || name == "Mining Quarry" || name == "Radtown" || name == "Desert Military Base") return 1;
            return 0; // Safezones / Supermarket / Gas station / Lighthouse / Cabins
        }

        private List<object> GetAllToolCupboards()
        {
            var list = new List<object>();
            try
            {
                var deadTcs = new List<BuildingPrivlidge>();
                foreach (var tc in activeToolCupboards)
                {
                    if (tc == null || !tc.IsValid())
                    {
                        deadTcs.Add(tc);
                        continue;
                    }
                    var pos = tc.transform.position;
                    var authList = new List<object>();
                    if (tc.authorizedPlayers != null)
                    {
                        foreach (var uid in tc.authorizedPlayers)
                        {
                            string pName = covalence.Players.FindPlayerById(uid.ToString())?.Name ?? "Player";
                            authList.Add(new
                            {
                                steamId = uid.ToString(),
                                name = pName
                            });
                        }
                    }
                    int protectedMins = (int)Math.Round((double)tc.GetProtectedMinutes());
                    bool isDecaying = protectedMins <= 0;

                    var blockList = new List<object>();
                    try
                    {
                        var building = tc.GetBuilding();
                        if (building != null && building.buildingBlocks != null)
                        {
                            int sampled = 0;
                            foreach (var b in building.buildingBlocks)
                            {
                                if (b == null || !b.IsValid()) continue;
                                var bPos = b.transform.position;
                                string gradeName = b.grade.ToString().ToLowerInvariant();
                                string bType = b.ShortPrefabName ?? "block";
                                blockList.Add(new
                                {
                                    x = Math.Round((double)bPos.x, 1),
                                    y = Math.Round((double)bPos.y, 1),
                                    z = Math.Round((double)bPos.z, 1),
                                    grade = gradeName,
                                    type = bType,
                                    rot = Math.Round((double)b.transform.eulerAngles.y, 1)
                                });
                                sampled++;
                                if (sampled >= 15) break;
                            }
                        }
                    }
                    catch {}

                    list.Add(new
                    {
                        id = tc.net?.ID.Value ?? 0,
                        grid = GetGridString(pos),
                        pos = new { x = Math.Round((double)pos.x, 1), y = Math.Round((double)pos.y, 1), z = Math.Round((double)pos.z, 1) },
                        upkeepMinutes = protectedMins,
                        isDecaying = isDecaying,
                        authorizedCount = tc.authorizedPlayers?.Count ?? 0,
                        authorized = authList,
                        inventory = DumpContainer(tc.inventory),
                        blocks = blockList
                    });
                }
                foreach (var dead in deadTcs) activeToolCupboards.Remove(dead);
            }
            catch (Exception ex)
            {
                Puts($"[RustPlayerBridge] GetAllToolCupboards error: {ex.Message}");
            }
            return list;
        }

        private List<object> GetLiveWorldEvents()
        {
            var list = new List<object>();
            try
            {
                // 1. Patrol Helicopters
                var deadHelis = new List<BaseHelicopter>();
                foreach (var h in activeHelis)
                {
                    if (h == null || !h.IsValid() || h.IsDead())
                    {
                        deadHelis.Add(h);
                        continue;
                    }
                    var pos = h.transform.position;
                    list.Add(new
                    {
                        id = h.net?.ID.Value ?? 0,
                        type = "patrol_heli",
                        name = "Patrol Helicopter",
                        health = (int)Math.Round((double)h.health),
                        maxHealth = (int)Math.Round((double)h.MaxHealth()),
                        grid = GetGridString(pos),
                        pos = new { x = Math.Round((double)pos.x, 1), y = Math.Round((double)pos.y, 1), z = Math.Round((double)pos.z, 1) },
                        rotation = Math.Round((double)h.transform.eulerAngles.y, 1)
                    });
                }
                foreach (var dead in deadHelis) activeHelis.Remove(dead);

                // 2. Cargo Ships
                var deadShips = new List<CargoShip>();
                foreach (var s in activeCargoShips)
                {
                    if (s == null || !s.IsValid())
                    {
                        deadShips.Add(s);
                        continue;
                    }
                    var pos = s.transform.position;
                    list.Add(new
                    {
                        id = s.net?.ID.Value ?? 0,
                        type = "cargo_ship",
                        name = "Cargo Ship (CCMS Rust)",
                        grid = GetGridString(pos),
                        pos = new { x = Math.Round((double)pos.x, 1), y = Math.Round((double)pos.y, 1), z = Math.Round((double)pos.z, 1) },
                        rotation = Math.Round((double)s.transform.eulerAngles.y, 1)
                    });
                }
                foreach (var dead in deadShips) activeCargoShips.Remove(dead);

                // 3. Bradley APCs
                var deadBradleys = new List<BradleyAPC>();
                foreach (var b in activeBradleys)
                {
                    if (b == null || !b.IsValid() || b.IsDead())
                    {
                        deadBradleys.Add(b);
                        continue;
                    }
                    var pos = b.transform.position;
                    list.Add(new
                    {
                        id = b.net?.ID.Value ?? 0,
                        type = "bradley_apc",
                        name = "Bradley APC",
                        health = (int)Math.Round((double)b.health),
                        maxHealth = (int)Math.Round((double)b.MaxHealth()),
                        grid = GetGridString(pos),
                        pos = new { x = Math.Round((double)pos.x, 1), y = Math.Round((double)pos.y, 1), z = Math.Round((double)pos.z, 1) },
                        rotation = Math.Round((double)b.transform.eulerAngles.y, 1)
                    });
                }
                foreach (var dead in deadBradleys) activeBradleys.Remove(dead);

                // 4. Supply Drops
                var deadDrops = new List<SupplyDrop>();
                foreach (var d in activeSupplyDrops)
                {
                    if (d == null || !d.IsValid())
                    {
                        deadDrops.Add(d);
                        continue;
                    }
                    var pos = d.transform.position;
                    list.Add(new
                    {
                        id = d.net?.ID.Value ?? 0,
                        type = "supply_drop",
                        name = "Supply Drop",
                        grid = GetGridString(pos),
                        pos = new { x = Math.Round((double)pos.x, 1), y = Math.Round((double)pos.y, 1), z = Math.Round((double)pos.z, 1) }
                    });
                }
                foreach (var dead in deadDrops) activeSupplyDrops.Remove(dead);

                // 5. Hackable Locked Crates
                var deadCrates = new List<HackableLockedCrate>();
                foreach (var c in activeLockedCrates)
                {
                    if (c == null || !c.IsValid())
                    {
                        deadCrates.Add(c);
                        continue;
                    }
                    var pos = c.transform.position;
                    list.Add(new
                    {
                        id = c.net?.ID.Value ?? 0,
                        type = "locked_crate",
                        name = "Locked Crate (CH47)",
                        grid = GetGridString(pos),
                        pos = new { x = Math.Round((double)pos.x, 1), y = Math.Round((double)pos.y, 1), z = Math.Round((double)pos.z, 1) },
                        hackSeconds = (int)Math.Round((double)c.hackSeconds),
                        isFullyHacked = c.hackSeconds >= 900f
                    });
                }
                foreach (var dead in deadCrates) activeLockedCrates.Remove(dead);
            }
            catch (Exception ex)
            {
                Puts($"[RustPlayerBridge] GetLiveWorldEvents error: {ex.Message}");
            }
            return list;
        }

        private List<object> GetSleepingBags(BasePlayer player)
        {
            var list = new List<object>();
            try
            {
                var bags = SleepingBag.FindForPlayer(player.userID, true);
                if (bags != null)
                {
                    foreach (var b in bags)
                    {
                        if (b == null) continue;
                        list.Add(new
                        {
                            id = b.net?.ID.Value ?? 0,
                            name = b.niceName ?? "Sleeping Bag",
                            grid = GetGridString(b.transform.position),
                            pos = new { x = Math.Round((double)b.transform.position.x, 2), y = Math.Round((double)b.transform.position.y, 2), z = Math.Round((double)b.transform.position.z, 2) },
                            cooldown = Math.Max(0, (int)Math.Round((double)b.unlockTime - Time.realtimeSinceStartup))
                        });
                    }
                }
            }
            catch {}
            return list;
        }

        private List<object> GetToolCupboards(BasePlayer player)
        {
            var list = new List<object>();
            try
            {
                foreach (var tc in activeToolCupboards)
                {
                    if (tc == null || !tc.IsValid()) continue;
                    bool isAuthed = tc.IsAuthed(player) || (tc.authorizedPlayers != null && tc.authorizedPlayers.Contains(player.userID));
                    if (isAuthed)
                    {
                        var authList = new List<object>();
                        if (tc.authorizedPlayers != null)
                        {
                            foreach (var uid in tc.authorizedPlayers)
                            {
                                string pName = covalence.Players.FindPlayerById(uid.ToString())?.Name ?? "Player";
                                authList.Add(new
                                {
                                    steamId = uid.ToString(),
                                    name = pName
                                });
                            }
                        }

                        list.Add(new
                        {
                            id = tc.net?.ID.Value ?? 0,
                            grid = GetGridString(tc.transform.position),
                            upkeepMinutes = (int)Math.Round((double)tc.GetProtectedMinutes()),
                            authorizedCount = tc.authorizedPlayers?.Count ?? 0,
                            authorized = authList,
                            inventory = DumpContainer(tc.inventory)
                        });
                    }
                }
            }
            catch {}
            return list;
        }

        private List<string> GetUnlockedBlueprints(BasePlayer player)
        {
            var list = new List<string>();
            try
            {
                if (player?.blueprints != null && ItemManager.itemList != null)
                {
                    foreach (var def in ItemManager.itemList)
                    {
                        if (def == null || def.Blueprint == null) continue;
                        // Avoid Facepunch HasUnlocked() which triggers Steam DLC license checks and console spam!
                        // IsUnlocked checks if player researched it, defaultBlueprint means learned by default.
                        if (def.Blueprint.defaultBlueprint || player.blueprints.IsUnlocked(def))
                        {
                            if (!string.IsNullOrEmpty(def.shortname))
                            {
                                list.Add(def.shortname);
                            }
                        }
                    }
                }
            }
            catch {}
            return list;
        }

        #endregion

        #region Player Search & Utils

        private bool IsAdmin(IPlayer player)
        {
            if (player == null) return false;
            if (player.IsServer) return true;
            if (player.IsAdmin) return true;
            return permission.UserHasPermission(player.Id, PERM_ADMIN);
        }

        private BasePlayer FindPlayer(ulong steamId)
        {
            foreach (var p in BasePlayer.activePlayerList)
            {
                if (p != null && p.userID == steamId) return p;
            }
            var byId = BasePlayer.FindByID(steamId);
            if (byId != null) return byId;
            var sleeping = BasePlayer.FindSleeping(steamId);
            if (sleeping != null) return sleeping;
            return BasePlayer.FindAwakeOrSleeping(steamId.ToString());
        }

        private static float GetGroundHeight(float x, float z)
        {
            float terrainH = 0f;
            float waterH = 0f;

            try
            {
                if (TerrainMeta.HeightMap != null)
                {
                    terrainH = TerrainMeta.HeightMap.GetHeight(new Vector3(x, 0, z));
                }
            }
            catch {}

            try
            {
                if (TerrainMeta.WaterMap != null)
                {
                    waterH = TerrainMeta.WaterMap.GetHeight(new Vector3(x, 0, z));
                }
            }
            catch {}

            float baseGround = Mathf.Max(terrainH, waterH);

            try
            {
                float originY = Mathf.Max(baseGround + 30f, 35f);
                Vector3 origin = new Vector3(x, originY, z);
                int mask = LayerMask.GetMask("Terrain", "World", "Construction", "Deployed");
                if (mask == 0)
                {
                    mask = Rust.Layers.Mask.Terrain | Rust.Layers.Mask.World | Rust.Layers.Mask.Construction | Rust.Layers.Mask.Deployed;
                }

                if (Physics.Raycast(origin, Vector3.down, out RaycastHit hit, 40f, mask, QueryTriggerInteraction.Ignore))
                {
                    if (hit.point.y >= (baseGround - 2f) && hit.point.y <= (baseGround + 40f))
                    {
                        return Mathf.Max(hit.point.y, baseGround);
                    }
                }
            }
            catch {}

            return baseGround;
        }

        #endregion

        #region Console Commands

        private void CmdExport(IPlayer caller, string command, string[] args)
        {
            if (!IsAdmin(caller)) return;

            if (args != null && args.Length > 0 && ulong.TryParse(args[0], out ulong steamId))
            {
                var player = FindPlayer(steamId);
                if (player != null)
                {
                    ExportPlayer(player);
                }
            }
            else
            {
                ExportState();
            }

            Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = "State exported successfully" }));
        }

        private void CmdPing(IPlayer player, string command, string[] args)
        {
            if (!IsAdmin(player)) return;

            var payload = new
            {
                ok = true,
                version = "1.0.8",
                engine = "Oxide/Carbon",
                ents = BaseNetworkable.serverEntities != null ? BaseNetworkable.serverEntities.Count : 0,
                fps = (int)Math.Round((double)Performance.current.frameRate),
                players = BasePlayer.activePlayerList.Count,
                sleeping = BasePlayer.sleepingPlayerList.Count,
                maxPlayers = ConVar.Server.maxplayers,
                uptime = (int)Time.realtimeSinceStartup,
                serverGodmode = serverGodmode
            };

            Reply(player, JsonConvert.SerializeObject(payload));
        }

        private void CmdPlayers(IPlayer caller, string command, string[] args)
        {
            if (!IsAdmin(caller)) return;
            ExportState();
            Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = "Roster exported" }));
        }

        private void CmdPlayer(IPlayer caller, string command, string[] args)
        {
            if (!IsAdmin(caller)) return;
            if (args == null || args.Length == 0) return;

            if (ulong.TryParse(args[0], out ulong steamId))
            {
                var player = FindPlayer(steamId);
                if (player != null)
                {
                    ExportPlayer(player);
                    Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = $"Exported player {steamId}" }));
                }
                else
                {
                    Reply(caller, JsonConvert.SerializeObject(new { ok = false, error = "Player not found" }));
                }
            }
        }

        private void CmdInventory(IPlayer caller, string command, string[] args)
        {
            if (!IsAdmin(caller)) return;
            if (args == null || args.Length < 2) return;

            if (!ulong.TryParse(args[0], out ulong steamId)) return;
            var player = FindPlayer(steamId);
            if (player == null)
            {
                Reply(caller, JsonConvert.SerializeObject(new { ok = false, error = "Player not found" }));
                return;
            }

            string action = args[1].ToLowerInvariant();

            if (action == "give")
            {
                if (args.Length < 3) return;
                string shortname = args[2];
                int amount = args.Length > 3 && int.TryParse(args[3], out int amt) ? amt : 1;
                ulong skin = args.Length > 4 && ulong.TryParse(args[4], out ulong sk) ? sk : 0;

                var item = ItemManager.CreateByName(shortname, amount, skin);
                if (item != null)
                {
                    if (item.info != null && item.info.stackable < amount)
                    {
                        item.info.stackable = amount;
                    }
                    if (!player.inventory.GiveItem(item))
                    {
                        item.Drop(player.transform.position, Vector3.up * 1f);
                    }
                    try
                    {
                        player.inventory?.containerMain?.MarkDirty();
                        player.inventory?.containerBelt?.MarkDirty();
                        player.inventory?.containerWear?.MarkDirty();
                        player.inventory?.SendSnapshot();
                    }
                    catch {}
                    player.SendNetworkUpdateImmediate();
                    ExportPlayer(player);
                    ExportState();
                    Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = $"Gave {amount}x {shortname} to {player.displayName}" }));
                }
                else
                {
                    Reply(caller, JsonConvert.SerializeObject(new { ok = false, error = $"Item {shortname} not found" }));
                }
            }
            else if (action == "clear")
            {
                string targetContainer = args.Length > 2 ? args[2].ToLowerInvariant() : "all";
                if (targetContainer == "main" || targetContainer == "all") ClearContainer(player.inventory?.containerMain);
                if (targetContainer == "belt" || targetContainer == "all") ClearContainer(player.inventory?.containerBelt);
                if (targetContainer == "wear" || targetContainer == "all") ClearContainer(player.inventory?.containerWear);

                try
                {
                    player.inventory?.containerMain?.MarkDirty();
                    player.inventory?.containerBelt?.MarkDirty();
                    player.inventory?.containerWear?.MarkDirty();
                    player.inventory?.SendSnapshot();
                }
                catch {}
                player.SendNetworkUpdateImmediate();
                ExportPlayer(player);
                ExportState();
                Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = $"Cleared {targetContainer} inventory for {player.displayName}" }));
            }
            else if (action == "set_slot")
            {
                if (args.Length < 6) return;
                string contName = args[2].ToLowerInvariant();
                if (!int.TryParse(args[3], out int slot)) return;
                string shortname = args[4];
                if (!int.TryParse(args[5], out int amount)) return;
                ulong skin = args.Length > 6 && ulong.TryParse(args[6], out ulong sk) ? sk : 0;

                var container = GetContainer(player, contName);
                if (container != null)
                {
                    var existing = container.GetSlot(slot);
                    if (existing != null)
                    {
                        existing.RemoveFromContainer();
                        existing.Remove();
                    }

                    if (!string.IsNullOrEmpty(shortname) && amount > 0)
                    {
                        var newItem = ItemManager.CreateByName(shortname, amount, skin);
                        if (newItem != null)
                        {
                            if (newItem.info != null && newItem.info.stackable < amount)
                            {
                                newItem.info.stackable = amount;
                            }
                            if (!newItem.MoveToContainer(container, slot))
                            {
                                player.inventory.GiveItem(newItem);
                            }
                        }
                    }

                    try
                    {
                        player.inventory?.containerMain?.MarkDirty();
                        player.inventory?.containerBelt?.MarkDirty();
                        player.inventory?.containerWear?.MarkDirty();
                        player.inventory?.SendSnapshot();
                    }
                    catch {}
                    player.SendNetworkUpdateImmediate();
                    ExportPlayer(player);
                    ExportState();
                    Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = $"Updated slot {slot} in {contName}" }));
                }
            }
            else if (action == "remove" || action == "remove_slot")
            {
                if (args.Length < 4) return;
                string contName = args[2].ToLowerInvariant();
                if (!int.TryParse(args[3], out int slot)) return;

                var container = GetContainer(player, contName);
                if (container != null)
                {
                    var existing = container.GetSlot(slot);
                    if (existing != null)
                    {
                        existing.RemoveFromContainer();
                        existing.Remove();
                    }
                    try
                    {
                        player.inventory?.containerMain?.MarkDirty();
                        player.inventory?.containerBelt?.MarkDirty();
                        player.inventory?.containerWear?.MarkDirty();
                        player.inventory?.SendSnapshot();
                    }
                    catch {}
                    player.SendNetworkUpdateImmediate();
                    ExportPlayer(player);
                    ExportState();
                    Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = $"Removed slot {slot} from {contName}" }));
                }
            }
        }

        private void CmdGod(IPlayer caller, string command, string[] args)
        {
            if (!IsAdmin(caller)) return;
            if (args == null || args.Length < 2) return;

            if (!ulong.TryParse(args[0], out ulong steamId)) return;
            string action = args[1].ToLowerInvariant();

            if (action == "ban")
            {
                string reason = args.Length > 2 ? args[2] : "Banned by administrator";
                long duration = args.Length > 3 && long.TryParse(args[3], out long dur) ? dur : 0;
                long expiry = duration > 0 ? (DateTimeOffset.UtcNow.ToUnixTimeSeconds() + duration) : -1L;
                var onlinePlayer = FindPlayer(steamId);
                string pName = onlinePlayer != null ? (onlinePlayer.displayName ?? "Rust Player") : (args.Length > 4 ? args[4] : "Rust Player");
                ServerUsers.Set(steamId, ServerUsers.UserGroup.Banned, pName, reason, expiry);
                ServerUsers.Save();
                if (onlinePlayer != null)
                {
                    onlinePlayer.Kick($"Banned: {reason}");
                    ExportPlayer(onlinePlayer);
                }
                ExportState();
                Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = $"Banned player {pName} ({steamId})" }));
                return;
            }
            else if (action == "unban")
            {
                ServerUsers.Remove(steamId);
                ServerUsers.Save();
                ExportState();
                Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = $"Unbanned player {steamId}" }));
                return;
            }

            var player = FindPlayer(steamId);
            if (player == null)
            {
                Reply(caller, JsonConvert.SerializeObject(new { ok = false, error = "Player not found" }));
                return;
            }

            if (action == "heal")
            {
                player.health = player.MaxHealth();
                if (player.metabolism != null)
                {
                    player.metabolism.calories.value = player.metabolism.calories.max;
                    player.metabolism.hydration.value = player.metabolism.hydration.max;
                    player.metabolism.bleeding.value = 0f;
                    player.metabolism.radiation_poison.value = 0f;
                    player.metabolism.poison.value = 0f;
                    player.metabolism.oxygen.value = player.metabolism.oxygen.max;
                }
                if (player.IsWounded()) player.StopWounded();
                player.SendNetworkUpdateImmediate();
                QueuePlayerExport(player);
                QueueStateExport(0.2f);
                Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = "Player healed" }));
            }
            else if (action == "feed")
            {
                if (player.metabolism != null)
                {
                    player.metabolism.calories.value = player.metabolism.calories.max;
                    player.metabolism.hydration.value = player.metabolism.hydration.max;
                }
                player.SendNetworkUpdateImmediate();
                QueuePlayerExport(player);
                QueueStateExport(0.2f);
                Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = "Player fed" }));
            }
            else if (action == "godmode")
            {
                bool enable = args.Length > 2 ? bool.Parse(args[2]) : !godmodePlayers.Contains(steamId);
                if (enable)
                {
                    godmodePlayers.Add(steamId);
                    player.health = player.MaxHealth();
                    if (player.metabolism != null)
                    {
                        player.metabolism.calories.value = player.metabolism.calories.max;
                        player.metabolism.hydration.value = player.metabolism.hydration.max;
                        player.metabolism.bleeding.value = 0f;
                        player.metabolism.poison.value = 0f;
                        player.metabolism.radiation_poison.value = 0f;
                        player.metabolism.oxygen.value = player.metabolism.oxygen.max;
                    }
                    if (player.IsWounded()) player.StopWounded();
                }
                else
                {
                    godmodePlayers.Remove(steamId);
                }
                player.SendNetworkUpdateImmediate();
                QueuePlayerExport(player);
                QueueStateExport(0.2f);
                Reply(caller, JsonConvert.SerializeObject(new { ok = true, god = enable, message = $"Godmode {(enable ? "enabled" : "disabled")}" }));
            }
            else if (action == "freeze")
            {
                frozenPlayers.Add(steamId);
                frozenPositions[steamId] = player.transform.position;
                player.ChatMessage("<color=#38bdf8>[Admin]</color> <color=#ffffff>You have been frozen by an administrator.</color>");
                player.SendNetworkUpdateImmediate();
                ExportPlayer(player);
                ExportState();
                Reply(caller, JsonConvert.SerializeObject(new { ok = true, frozen = true, message = $"Frozen player {player.displayName}" }));
            }
            else if (action == "unfreeze")
            {
                frozenPlayers.Remove(steamId);
                frozenPositions.Remove(steamId);
                player.ChatMessage("<color=#10b981>[Admin]</color> <color=#ffffff>You have been unfrozen.</color>");
                player.SendNetworkUpdateImmediate();
                ExportPlayer(player);
                ExportState();
                Reply(caller, JsonConvert.SerializeObject(new { ok = true, frozen = false, message = $"Unfrozen player {player.displayName}" }));
            }
            else if (action == "resurrect")
            {
                if (player.IsWounded()) player.StopWounded();
                if (player.IsSleeping()) player.EndSleeping();
                if (player.IsDead() || player.health <= 0f) player.Respawn();
                player.health = player.MaxHealth();
                if (player.metabolism != null)
                {
                    player.metabolism.calories.value = player.metabolism.calories.max;
                    player.metabolism.hydration.value = player.metabolism.hydration.max;
                    player.metabolism.bleeding.value = 0f;
                    player.metabolism.radiation_poison.value = 0f;
                    player.metabolism.poison.value = 0f;
                    player.metabolism.oxygen.value = player.metabolism.oxygen.max;
                }
                player.SendNetworkUpdateImmediate();
                QueuePlayerExport(player);
                QueueStateExport(0.2f);
                Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = "Player resurrected" }));
            }
            else if (action == "kill")
            {
                godmodePlayers.Remove(player.userID);
                player.Hurt(100000f, Rust.DamageType.Suicide, null, false);
                if (!player.IsDead()) player.Die();
                player.SendNetworkUpdateImmediate();
                QueuePlayerExport(player);
                QueueStateExport(0.2f);
                Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = "Player killed" }));
            }
            else if (action == "kick")
            {
                string reason = args.Length > 2 ? args[2] : "Kicked by administrator";
                player.Kick(reason);
                QueueStateExport(0.2f);
                Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = $"Kicked player {player.displayName}" }));
            }
        }

        private void CmdTechTree(IPlayer caller, string command, string[] args)
        {
            if (!IsAdmin(caller)) return;
            if (args == null || args.Length < 2) return;

            if (!ulong.TryParse(args[0], out ulong steamId)) return;
            var player = FindPlayer(steamId);
            if (player == null) return;

            string action = args[1].ToLowerInvariant();
            if (action == "unlock")
            {
                if (args.Length < 3) return;
                string shortname = args[2];
                var def = ItemManager.FindItemDefinition(shortname);
                if (def != null && def.Blueprint != null)
                {
                    try
                    {
                        player.blueprints?.Unlock(def);
                        player.SendNetworkUpdateImmediate();
                    }
                    catch {}
                    QueuePlayerExport(player);
                    QueueStateExport(0.2f);
                    Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = $"Unlocked blueprint {shortname}" }));
                }
            }
            else if (action == "unlockall")
            {
                try
                {
                    if (ItemManager.itemList != null && player.blueprints != null)
                    {
                        foreach (var def in ItemManager.itemList)
                        {
                            if (def != null && def.Blueprint != null)
                            {
                                player.blueprints.Unlock(def);
                            }
                        }
                    }
                    player.SendNetworkUpdateImmediate();
                }
                catch {}
                QueuePlayerExport(player);
                QueueStateExport(0.2f);
                Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = "Unlocked all blueprints" }));
            }
            else if (action == "reset")
            {
                try
                {
                    player.blueprints?.Reset();
                    player.SendNetworkUpdateImmediate();
                }
                catch {}
                QueuePlayerExport(player);
                QueueStateExport(0.2f);
                Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = "Reset all blueprints" }));
            }
        }

        private void CmdServerAction(IPlayer caller, string command, string[] args)
        {
            if (!IsAdmin(caller)) return;
            if (args == null || args.Length == 0) return;

            string action = args[0].ToLowerInvariant();
            if (action == "healall")
            {
                int count = 0;
                foreach (var p in BasePlayer.activePlayerList)
                {
                    if (p == null) continue;
                    p.health = p.MaxHealth();
                    if (p.metabolism != null)
                    {
                        p.metabolism.calories.value = p.metabolism.calories.max;
                        p.metabolism.hydration.value = p.metabolism.hydration.max;
                        p.metabolism.bleeding.value = 0f;
                        p.metabolism.radiation_poison.value = 0f;
                        p.metabolism.poison.value = 0f;
                        p.metabolism.oxygen.value = p.metabolism.oxygen.max;
                    }
                    if (p.IsWounded()) p.StopWounded();
                    p.SendNetworkUpdateImmediate();
                    count++;
                }
                foreach (var p in BasePlayer.sleepingPlayerList)
                {
                    if (p == null || BasePlayer.activePlayerList.Contains(p)) continue;
                    p.health = p.MaxHealth();
                    if (p.metabolism != null)
                    {
                        p.metabolism.calories.value = p.metabolism.calories.max;
                        p.metabolism.hydration.value = p.metabolism.hydration.max;
                        p.metabolism.bleeding.value = 0f;
                        p.metabolism.radiation_poison.value = 0f;
                        p.metabolism.poison.value = 0f;
                        p.metabolism.oxygen.value = p.metabolism.oxygen.max;
                    }
                    p.SendNetworkUpdateImmediate();
                    count++;
                }
                QueueStateExport(0.2f);
                Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = $"Healed {count} players" }));
            }
            else if (action == "feedall")
            {
                int count = 0;
                foreach (var p in BasePlayer.activePlayerList)
                {
                    if (p == null) continue;
                    if (p.metabolism != null)
                    {
                        p.metabolism.calories.value = p.metabolism.calories.max;
                        p.metabolism.hydration.value = p.metabolism.hydration.max;
                    }
                    p.SendNetworkUpdateImmediate();
                    count++;
                }
                foreach (var p in BasePlayer.sleepingPlayerList)
                {
                    if (p == null || BasePlayer.activePlayerList.Contains(p)) continue;
                    if (p.metabolism != null)
                    {
                        p.metabolism.calories.value = p.metabolism.calories.max;
                        p.metabolism.hydration.value = p.metabolism.hydration.max;
                    }
                    p.SendNetworkUpdateImmediate();
                    count++;
                }
                QueueStateExport(0.2f);
                Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = $"Fed {count} players" }));
            }
            else if (action == "godall")
            {
                serverGodmode = !serverGodmode;
                if (serverGodmode)
                {
                    foreach (var p in BasePlayer.activePlayerList)
                    {
                        if (p == null) continue;
                        p.health = p.MaxHealth();
                        if (p.metabolism != null)
                        {
                            p.metabolism.calories.value = p.metabolism.calories.max;
                            p.metabolism.hydration.value = p.metabolism.hydration.max;
                            p.metabolism.bleeding.value = 0f;
                            p.metabolism.radiation_poison.value = 0f;
                            p.metabolism.poison.value = 0f;
                            p.metabolism.oxygen.value = p.metabolism.oxygen.max;
                        }
                        if (p.IsWounded()) p.StopWounded();
                        p.SendNetworkUpdateImmediate();
                    }
                }
                QueueStateExport(0.2f);
                Reply(caller, JsonConvert.SerializeObject(new { ok = true, god = serverGodmode, message = $"Server Godmode {(serverGodmode ? "ENABLED" : "DISABLED")}" }));
            }
            else if (action == "time" && args.Length > 1 && float.TryParse(args[1], out float hourVal))
            {
                ConVar.Env.time = hourVal;
                QueueStateExport(0.2f);
                Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = $"Set time to {hourVal}:00" }));
            }
            else if (action == "weather_clear" || action == "clearweather")
            {
                ConsoleSystem.Run(ConsoleSystem.Option.Server, "weather.clear");
                ConsoleSystem.Run(ConsoleSystem.Option.Server, "weather.clouds 0");
                ConsoleSystem.Run(ConsoleSystem.Option.Server, "weather.rain 0");
                ConsoleSystem.Run(ConsoleSystem.Option.Server, "weather.fog 0");
                ConsoleSystem.Run(ConsoleSystem.Option.Server, "weather.wind 0");
                Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = "Cleared weather" }));
            }
            else if (action == "weather_storm")
            {
                ConsoleSystem.Run(ConsoleSystem.Option.Server, "weather.clouds 1");
                ConsoleSystem.Run(ConsoleSystem.Option.Server, "weather.rain 1");
                ConsoleSystem.Run(ConsoleSystem.Option.Server, "weather.storm 1");
                ConsoleSystem.Run(ConsoleSystem.Option.Server, "weather.wind 1");
                Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = "Summoned storm" }));
            }
            else if (action == "weather_fog")
            {
                ConsoleSystem.Run(ConsoleSystem.Option.Server, "weather.fog 1");
                Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = "Set fog" }));
            }
            else if (action == "weather_rain")
            {
                ConsoleSystem.Run(ConsoleSystem.Option.Server, "weather.rain 1");
                Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = "Set rain" }));
            }
            else if (action == "airdrop")
            {
                ConsoleSystem.Run(ConsoleSystem.Option.Server, "supply.drop");
                Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = "Called Supply Drop (Airdrop)" }));
            }
            else if (action == "heli")
            {
                ConsoleSystem.Run(ConsoleSystem.Option.Server, "heli.call");
                Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = "Called Patrol Helicopter" }));
            }
            else if (action == "cargoship")
            {
                ConsoleSystem.Run(ConsoleSystem.Option.Server, "cargoship.call");
                Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = "Called Cargo Ship" }));
            }
            else if (action == "killsleepers")
            {
                int count = 0;
                var sleepers = new HashSet<BasePlayer>();
                foreach (var p in BasePlayer.sleepingPlayerList)
                {
                    if (p != null) sleepers.Add(p);
                }
                foreach (var p in BasePlayer.allPlayerList)
                {
                    if (p != null && (p.IsSleeping() || !p.IsConnected)) sleepers.Add(p);
                }
                foreach (var p in sleepers)
                {
                    try
                    {
                        godmodePlayers.Remove(p.userID);
                        p.health = 0f;
                        if (p.metabolism != null)
                        {
                            p.metabolism.calories.value = 0f;
                            p.metabolism.hydration.value = 0f;
                        }
                        try { p.Die(); } catch { p.Hurt(100000f, Rust.DamageType.Suicide, null, false); }
                        p.SendNetworkUpdateImmediate();
                        count++;
                    }
                    catch {}
                }
                QueueStateExport(0.2f);
                Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = $"Killed {count} sleeping players" }));
            }
            else if (action == "tp_pos" && args.Length > 2 && ulong.TryParse(args[1], out ulong tpSteamId) && float.TryParse(args[2], out float tpX))
            {
                float tpZ = 0f;
                if (args.Length > 4 && float.TryParse(args[4], out float parsedZ4))
                {
                    tpZ = parsedZ4;
                }
                else if (args.Length > 3 && float.TryParse(args[3], out float parsedZ3))
                {
                    tpZ = parsedZ3;
                }

                var target = FindPlayer(tpSteamId);
                if (target != null)
                {
                    float groundY = GetGroundHeight(tpX, tpZ);
                    Vector3 destination = new Vector3(tpX, groundY + 0.35f, tpZ);

                    target.Teleport(destination);
                    target.SendNetworkUpdateImmediate();
                    QueuePlayerExport(target);
                    QueueStateExport(0.2f);
                    Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = $"Teleported {target.displayName} to ({tpX:F1}, {groundY + 0.35f:F1}, {tpZ:F1})" }));
                }
                else
                {
                    Reply(caller, JsonConvert.SerializeObject(new { ok = false, error = "Target player not found" }));
                }
            }
            else if (action == "airdrop_pos" && args.Length > 2 && float.TryParse(args[1], out float adX))
            {
                float adZ = 0f;
                if (args.Length > 3 && float.TryParse(args[3], out float pZ)) adZ = pZ;
                else if (args.Length > 2 && float.TryParse(args[2], out float pZ2)) adZ = pZ2;

                float groundY = GetGroundHeight(adX, adZ);
                float dropY = groundY + 140f;
                var entity = GameManager.server.CreateEntity("assets/prefabs/misc/supply drop/supply_drop.prefab", new Vector3(adX, dropY, adZ));
                if (entity != null)
                {
                    entity.Spawn();
                    Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = $"Spawned Supply Drop at ({adX:F1}, {groundY:F1}, {adZ:F1})" }));
                }
                else
                {
                    ConsoleSystem.Run(ConsoleSystem.Option.Server, $"supply.drop {adX} {dropY} {adZ}");
                    Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = "Called Supply Drop" }));
                }
            }
            else if (action == "heli_pos" && args.Length > 2 && float.TryParse(args[1], out float hX))
            {
                float hZ = 0f;
                if (args.Length > 3 && float.TryParse(args[3], out float pZ)) hZ = pZ;
                else if (args.Length > 2 && float.TryParse(args[2], out float pZ2)) hZ = pZ2;

                float groundY = GetGroundHeight(hX, hZ);
                float flyY = groundY + 65f;
                var entity = GameManager.server.CreateEntity("assets/prefabs/npc/patrol helicopter/patrolhelicopter.prefab", new Vector3(hX, flyY, hZ)) as BaseHelicopter;
                if (entity != null)
                {
                    entity.Spawn();
                    Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = $"Called Patrol Helicopter to ({hX:F1}, {groundY:F1}, {hZ:F1})" }));
                }
                else
                {
                    ConsoleSystem.Run(ConsoleSystem.Option.Server, "heli.call");
                    Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = "Called Patrol Helicopter" }));
                }
            }
            else if (action == "bradley_pos" && args.Length > 2 && float.TryParse(args[1], out float bX))
            {
                float bZ = 0f;
                if (args.Length > 3 && float.TryParse(args[3], out float pZ)) bZ = pZ;
                else if (args.Length > 2 && float.TryParse(args[2], out float pZ2)) bZ = pZ2;

                float groundY = GetGroundHeight(bX, bZ);
                var entity = GameManager.server.CreateEntity("assets/prefabs/npc/m2bradley/bradleyapc.prefab", new Vector3(bX, groundY + 0.5f, bZ)) as BradleyAPC;
                if (entity != null)
                {
                    entity.Spawn();
                    Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = $"Spawned Bradley APC at ({bX:F1}, {groundY + 0.5f:F1}, {bZ:F1})" }));
                }
                else
                {
                    ConsoleSystem.Run(ConsoleSystem.Option.Server, $"spawn bradleyapc {bX} {groundY + 0.5f} {bZ}");
                    Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = "Spawned Bradley APC" }));
                }
            }
            else if (action == "explosion_pos" && args.Length > 2 && float.TryParse(args[1], out float eX))
            {
                float eZ = 0f;
                if (args.Length > 3 && float.TryParse(args[3], out float pZ)) eZ = pZ;
                else if (args.Length > 2 && float.TryParse(args[2], out float pZ2)) eZ = pZ2;

                float groundY = GetGroundHeight(eX, eZ);
                Vector3 strikePos = new Vector3(eX, groundY + 0.25f, eZ);

                Effect.server.Run("assets/prefabs/tools/c4/effects/c4_explosion.prefab", strikePos);
                Effect.server.Run("assets/prefabs/npc/m2bradley/effects/bradley_apc_explosion.prefab", strikePos);

                List<BaseCombatEntity> entities = new List<BaseCombatEntity>();
                Vis.Entities<BaseCombatEntity>(strikePos, 12f, entities);
                foreach (var ent in entities)
                {
                    if (ent != null && !ent.IsDead())
                    {
                        ent.Hurt(250f, Rust.DamageType.Explosion);
                    }
                }

                Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = $"Triggered precision C4 airstrike blast at ({eX:F1}, {groundY + 0.25f:F1}, {eZ:F1})" }));
            }
            else if (action == "mlrs_pos" && args.Length > 2 && float.TryParse(args[1], out float mX))
            {
                float mZ = 0f;
                if (args.Length > 3 && float.TryParse(args[3], out float pZ)) mZ = pZ;
                else if (args.Length > 2 && float.TryParse(args[2], out float pZ2)) mZ = pZ2;

                for (int i = 0; i < 14; i++)
                {
                    float delay = i * 0.20f;
                    timer.Once(delay, () => {
                        float offsetX = UnityEngine.Random.Range(-12f, 12f);
                        float offsetZ = UnityEngine.Random.Range(-12f, 12f);
                        float strikeX = mX + offsetX;
                        float strikeZ = mZ + offsetZ;
                        float strikeY = GetGroundHeight(strikeX, strikeZ) + 0.25f;
                        Vector3 strikePos = new Vector3(strikeX, strikeY, strikeZ);

                        Effect.server.Run("assets/prefabs/npc/m2bradley/effects/bradley_apc_explosion.prefab", strikePos);
                        Effect.server.Run("assets/prefabs/tools/c4/effects/c4_explosion.prefab", strikePos);

                        List<BaseCombatEntity> entities = new List<BaseCombatEntity>();
                        Vis.Entities<BaseCombatEntity>(strikePos, 12f, entities);
                        foreach (var ent in entities)
                        {
                            if (ent != null && !ent.IsDead())
                            {
                                ent.Hurt(180f, Rust.DamageType.Explosion);
                            }
                        }
                    });
                }
                Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = $"Triggered MLRS rocket barrage at ({mX:F1}, {mZ:F1})" }));
            }
            else if (action == "chinook_pos" && args.Length > 2 && float.TryParse(args[1], out float chX))
            {
                float chZ = 0f;
                if (args.Length > 3 && float.TryParse(args[3], out float pZ)) chZ = pZ;
                else if (args.Length > 2 && float.TryParse(args[2], out float pZ2)) chZ = pZ2;

                float groundY = GetGroundHeight(chX, chZ);
                float flyY = groundY + 75f;
                var entity = GameManager.server.CreateEntity("assets/prefabs/npc/ch47/ch47scientists.entity.prefab", new Vector3(chX, flyY, chZ));
                if (entity != null)
                {
                    entity.Spawn();
                    Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = $"Spawned CH47 Chinook Scientists squad at ({chX:F1}, {groundY:F1}, {chZ:F1})" }));
                }
                else
                {
                    ConsoleSystem.Run(ConsoleSystem.Option.Server, "spawn ch47scientists.entity");
                    Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = "Spawned Chinook Scientists squad" }));
                }
            }
            else if (action == "bees_pos" && args.Length > 2 && float.TryParse(args[1], out float beeX))
            {
                float beeZ = 0f;
                if (args.Length > 3 && float.TryParse(args[3], out float pZ)) beeZ = pZ;
                else if (args.Length > 2 && float.TryParse(args[2], out float pZ2)) beeZ = pZ2;

                float groundY = GetGroundHeight(beeX, beeZ);
                Vector3 beePos = new Vector3(beeX, groundY + 1.2f, beeZ);
                Effect.server.Run("assets/prefabs/weapons/beegrenade/effects/bee_swarm.prefab", beePos);
                List<BasePlayer> victims = new List<BasePlayer>();
                Vis.Entities<BasePlayer>(beePos, 12f, victims);
                foreach (var p in victims)
                {
                    if (p != null && !p.IsDead())
                    {
                        p.Hurt(45f, Rust.DamageType.Poison);
                        if (p.metabolism != null) p.metabolism.poison.value = 80f;
                        p.ChatMessage("<color=#f59e0b>[BEES!]</color> <color=#ffffff>You are being attacked by an angry swarm of bees!</color>");
                    }
                }
                Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = $"Spawned Bee Swarm attack at ({beeX:F1}, {groundY + 1.2f:F1}, {beeZ:F1})" }));
            }
            else if (action == "whisper" && args.Length > 2 && ulong.TryParse(args[1], out ulong wSteamId))
            {
                var target = FindPlayer(wSteamId);
                string text = string.Join(" ", args.Skip(2));
                if (target != null)
                {
                    target.ChatMessage($"<color=#f59e0b><b>[ADMIN GOD MESSAGE]</b></color> <color=#ffffff>{text}</color>");
                    Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = $"Whispered to {target.displayName}: '{text}'" }));
                }
                else
                {
                    Reply(caller, JsonConvert.SerializeObject(new { ok = false, error = "Target player not found" }));
                }
            }
            else if (action == "freeze" && args.Length > 1 && ulong.TryParse(args[1], out ulong fzSteamId))
            {
                frozenPlayers.Add(fzSteamId);
                var target = FindPlayer(fzSteamId);
                if (target != null)
                {
                    frozenPositions[fzSteamId] = target.transform.position;
                    target.ChatMessage("<color=#38bdf8>[Admin]</color> <color=#ffffff>You have been frozen by an administrator.</color>");
                    target.SendNetworkUpdateImmediate();
                    ExportPlayer(target);
                }
                ExportState();
                Reply(caller, JsonConvert.SerializeObject(new { ok = true, frozen = true, message = $"Frozen player {fzSteamId}" }));
            }
            else if (action == "unfreeze" && args.Length > 1 && ulong.TryParse(args[1], out ulong ufzSteamId))
            {
                frozenPlayers.Remove(ufzSteamId);
                frozenPositions.Remove(ufzSteamId);
                var target = FindPlayer(ufzSteamId);
                if (target != null)
                {
                    target.ChatMessage("<color=#10b981>[Admin]</color> <color=#ffffff>You have been unfrozen.</color>");
                    target.SendNetworkUpdateImmediate();
                    ExportPlayer(target);
                }
                ExportState();
                Reply(caller, JsonConvert.SerializeObject(new { ok = true, frozen = false, message = $"Unfrozen player {ufzSteamId}" }));
            }
            else if (action == "spawn_vehicle" && args.Length > 3 && float.TryParse(args[2], out float vX))
            {
                string vType = args[1].ToLowerInvariant();
                float vZ = 0f;
                if (args.Length > 4 && float.TryParse(args[4], out float pZ)) vZ = pZ;
                else if (args.Length > 3 && float.TryParse(args[3], out float pZ2)) vZ = pZ2;

                string prefab = vType switch
                {
                    "minicopter" or "mini" => "assets/content/vehicles/minicopter/minicopter.entity.prefab",
                    "scrapheli" or "scrap" or "scraptransporthelicopter" => "assets/content/vehicles/scrap heli carrier/scraptransporthelicopter.prefab",
                    "attackheli" or "attack" or "attackhelicopter" => "assets/content/vehicles/attackhelicopter/attackhelicopter.entity.prefab",
                    "tugboat" or "tug" => "assets/content/vehicles/boats/tugboat/tugboat.prefab",
                    "rhib" => "assets/content/vehicles/boats/rhib/rhib.prefab",
                    "rowboat" or "boat" => "assets/content/vehicles/boats/rowboat/rowboat.prefab",
                    "car" or "sedan" or "modularcar" or "modularcar2" => "assets/content/vehicles/modularcar/2module_car_spawned.entity.prefab",
                    "modularcar3" or "car3" => "assets/content/vehicles/modularcar/3module_car_spawned.entity.prefab",
                    "modularcar4" or "car4" => "assets/content/vehicles/modularcar/4module_car_spawned.entity.prefab",
                    "horse" or "ridablehorse" or "testridablehorse" => "assets/rust.ai/nextgen/horses/ridablehorse.prefab",
                    "submarine" or "submarineduo" or "sub" => "assets/content/vehicles/submarine/submarineduo.entity.prefab",
                    "snowmobile" => "assets/content/vehicles/snowmobiles/snowmobile.prefab",
                    _ => "assets/content/vehicles/minicopter/minicopter.entity.prefab"
                };

                float groundY = GetGroundHeight(vX, vZ);
                float spawnHeight = groundY + (vType.Contains("boat") || vType.Contains("tug") || vType.Contains("sub") ? 0.1f : 0.6f);

                var entity = GameManager.server.CreateEntity(prefab, new Vector3(vX, spawnHeight, vZ));
                if (entity == null && (vType.Contains("horse") || vType == "ridablehorse"))
                {
                    string[] horsePrefabs = {
                        "assets/rust.ai/nextgen/horses/ridablehorse.prefab",
                        "assets/prefabs/npc/horse/ridablehorse.prefab",
                        "assets/content/vehicles/horse/ridablehorse.prefab",
                        "assets/prefabs/npc/horse/horse.prefab"
                    };
                    foreach (var hp in horsePrefabs)
                    {
                        entity = GameManager.server.CreateEntity(hp, new Vector3(vX, spawnHeight, vZ));
                        if (entity != null) break;
                    }
                }
                if (entity == null && GameManifest.Current?.entities != null)
                {
                    string searchKey = vType switch
                    {
                        "horse" or "ridablehorse" => "ridablehorse",
                        "minicopter" or "mini" => "minicopter.entity",
                        "scrapheli" or "scrap" => "scraptransporthelicopter",
                        "attackheli" or "attack" => "attackhelicopter.entity",
                        "tugboat" or "tug" => "tugboat",
                        "rhib" => "rhib.prefab",
                        "rowboat" => "rowboat.prefab",
                        "car" or "sedan" => "2module_car_spawned",
                        "submarine" or "sub" => "submarineduo",
                        "snowmobile" => "snowmobile.prefab",
                        _ => vType
                    };

                    foreach (var path in GameManifest.Current.entities)
                    {
                        if (path != null && path.IndexOf(searchKey, StringComparison.OrdinalIgnoreCase) >= 0)
                        {
                            entity = GameManager.server.CreateEntity(path, new Vector3(vX, spawnHeight, vZ));
                            if (entity != null) break;
                        }
                    }
                }

                if (entity != null)
                {
                    entity.Spawn();
                    try
                    {
                        var horse = entity as RidableHorse;
                        if (horse != null)
                        {
                            horse.currentStamina = horse.maxStamina;
                        }
                    }
                    catch {}
                    Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = $"Spawned {vType} at ({vX:F1}, {spawnHeight:F1}, {vZ:F1})" }));
                }
                else
                {
                    ConsoleSystem.Run(ConsoleSystem.Option.Server, $"spawn {vType} {vX} {spawnHeight} {vZ}");
                    Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = $"Spawned {vType}" }));
                }
            }
            else if (action == "fling" && args.Length > 1 && ulong.TryParse(args[1], out ulong flSteamId))
            {
                var target = FindPlayer(flSteamId);
                if (target != null)
                {
                    Vector3 currentPos = target.transform.position;
                    target.Teleport(currentPos + Vector3.up * 45f + target.transform.forward * 25f);
                    target.SendNetworkUpdateImmediate();
                    target.ChatMessage("<color=#f59e0b>[Admin]</color> <color=#ffffff>WHOOSH! You have been flung into the air by an administrator.</color>");
                    Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = $"Flung {target.displayName} high into the air" }));
                }
            }
            else if (action == "strip" && args.Length > 1 && ulong.TryParse(args[1], out ulong stSteamId))
            {
                var target = FindPlayer(stSteamId);
                if (target != null && target.inventory != null)
                {
                    ClearContainer(target.inventory.containerMain);
                    ClearContainer(target.inventory.containerBelt);
                    ClearContainer(target.inventory.containerWear);
                    target.inventory.containerMain?.MarkDirty();
                    target.inventory.containerBelt?.MarkDirty();
                    target.inventory.containerWear?.MarkDirty();
                    target.inventory.SendSnapshot();
                    target.SendNetworkUpdateImmediate();
                    target.ChatMessage("<color=#ef4444>[Admin]</color> <color=#ffffff>Your inventory has been wiped by an administrator.</color>");
                    ExportPlayer(target);
                    ExportState();
                    Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = $"Stripped all inventory from {target.displayName}" }));
                }
            }
            else if (action == "crate_pos" && args.Length > 2 && float.TryParse(args[1], out float crX))
            {
                float crZ = 0f;
                if (args.Length > 3 && float.TryParse(args[3], out float pZ)) crZ = pZ;
                else if (args.Length > 2 && float.TryParse(args[2], out float pZ2)) crZ = pZ2;

                float groundY = GetGroundHeight(crX, crZ);
                var entity = GameManager.server.CreateEntity("assets/prefabs/deployable/chinooklockedcrate/codelockedhackablecrate.prefab", new Vector3(crX, groundY + 0.35f, crZ));
                if (entity != null)
                {
                    entity.Spawn();
                    Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = $"Spawned Hackable Locked Crate (CH47) at ({crX:F1}, {groundY + 0.35f:F1}, {crZ:F1})" }));
                }
            }
            else if (action == "elite_crate_pos" && args.Length > 2 && float.TryParse(args[1], out float ecX))
            {
                float ecZ = 0f;
                if (args.Length > 3 && float.TryParse(args[3], out float pZ)) ecZ = pZ;
                else if (args.Length > 2 && float.TryParse(args[2], out float pZ2)) ecZ = pZ2;

                float groundY = GetGroundHeight(ecX, ecZ);
                var entity = GameManager.server.CreateEntity("assets/bundled/prefabs/radtown/crate_elite.prefab", new Vector3(ecX, groundY + 0.35f, ecZ));
                if (entity != null)
                {
                    entity.Spawn();
                    Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = $"Spawned Elite Loot Crate at ({ecX:F1}, {groundY + 0.35f:F1}, {ecZ:F1})" }));
                }
            }
            else if (action == "rendermap")
            {
                ConsoleSystem.Run(ConsoleSystem.Option.Server, "rendermap");
                ConsoleSystem.Run(ConsoleSystem.Option.Server, "sv rendermap");
                Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = "Triggered server map render" }));
            }
        }

        private void CmdAutoMod(IPlayer caller, string command, string[] args)
        {
            if (!IsAdmin(caller)) return;
            if (args == null || args.Length == 0)
            {
                Reply(caller, JsonConvert.SerializeObject(new { ok = true, config = config.AutoMod }));
                return;
            }

            try
            {
                string json = string.Join(" ", args);
                config.AutoMod = JsonConvert.DeserializeObject<AutoModConfig>(json) ?? new AutoModConfig();
                SaveConfig();
                Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = "Auto-mod updated" }));
            }
            catch (Exception ex)
            {
                Reply(caller, JsonConvert.SerializeObject(new { ok = false, error = ex.Message }));
            }
        }

        private void CmdRates(IPlayer caller, string command, string[] args)
        {
            if (!IsAdmin(caller)) return;
            if (config == null) config = new PluginConfig();
            if (config.Rates == null) config.Rates = new RatesConfig();

            if (args == null || args.Length == 0)
            {
                Reply(caller, JsonConvert.SerializeObject(new { ok = true, rates = config.Rates }));
                return;
            }

            try
            {
                string json = string.Join(" ", args);
                var parsed = JsonConvert.DeserializeObject<RatesConfig>(json);
                if (parsed != null)
                {
                    config.Rates = parsed;
                    if (config.Rates.CategoryStacks == null)
                    {
                        config.Rates.CategoryStacks = new Dictionary<string, int>();
                    }
                    SaveConfig();
                    UpdateStackSizes();
                    ExportState();
                    Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = "Rates updated", rates = config.Rates }));
                    return;
                }
            }
            catch (Exception ex)
            {
                Reply(caller, JsonConvert.SerializeObject(new { ok = false, error = ex.Message }));
            }
        }

        private void CmdConvar(IPlayer caller, string command, string[] args)
        {
            if (!IsAdmin(caller)) return;
            if (args == null || args.Length == 0) return;

            string convar = args[0];
            if (args.Length == 1)
            {
                string val = ConsoleSystem.Run(ConsoleSystem.Option.Server, convar);
                Reply(caller, JsonConvert.SerializeObject(new { ok = true, convar = convar, value = val }));
            }
            else
            {
                string newVal = string.Join(" ", args.Skip(1));
                ConsoleSystem.Run(ConsoleSystem.Option.Server, $"{convar} {newVal}");
                ConsoleSystem.Run(ConsoleSystem.Option.Server, "server.writecfg");
                Reply(caller, JsonConvert.SerializeObject(new { ok = true, convar = convar, value = newVal, message = $"Set {convar} to {newVal}" }));
            }
        }

        private void CmdDemo(IPlayer caller, string command, string[] args)
        {
            if (!IsAdmin(caller)) return;
            if (args == null || args.Length == 0) return;

            string sub = args[0].ToLowerInvariant();
            if (sub == "record" && args.Length > 1)
            {
                string name = args[1];
                ConsoleSystem.Run(ConsoleSystem.Option.Server, $"record {name}");
                Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = $"Started recording demo {name}" }));
            }
            else if (sub == "stop")
            {
                ConsoleSystem.Run(ConsoleSystem.Option.Server, "stop");
                Reply(caller, JsonConvert.SerializeObject(new { ok = true, message = "Stopped recording demo" }));
            }
        }

        #endregion

        #region Helpers

        private void EnsureDirectories()
        {
            try
            {
                string path = Path.Combine(Interface.Oxide.DataDirectory, "RustPlayerBridge");
                if (!Directory.Exists(path)) Directory.CreateDirectory(path);

                string playersPath = Path.Combine(path, "players");
                if (!Directory.Exists(playersPath)) Directory.CreateDirectory(playersPath);
            }
            catch {}
        }

        private void Reply(IPlayer caller, string msg)
        {
            if (caller != null)
            {
                try { caller.Reply(msg); } catch {}
            }
            else
            {
                Puts(msg);
            }
        }

        private ItemContainer GetContainer(BasePlayer player, string name)
        {
            if (player?.inventory == null) return null;
            return name switch
            {
                "main" => player.inventory.containerMain,
                "belt" => player.inventory.containerBelt,
                "wear" => player.inventory.containerWear,
                _ => null
            };
        }

        private void ClearContainer(ItemContainer container)
        {
            if (container == null || container.itemList == null) return;
            var items = container.itemList.ToList();
            foreach (var item in items)
            {
                if (item != null)
                {
                    item.RemoveFromContainer();
                    item.Remove();
                }
            }
        }

        private List<object> DumpContainer(ItemContainer container)
        {
            var list = new List<object>();
            if (container == null || container.itemList == null) return list;

            for (int i = 0; i < container.capacity; i++)
            {
                var item = container.GetSlot(i);
                if (item != null && item.info != null)
                {
                    list.Add(new
                    {
                        slot = i,
                        id = item.info.itemid,
                        shortname = item.info.shortname ?? "",
                        name = item.info.displayName?.english ?? item.info.shortname,
                        amount = item.amount,
                        condition = (int)Math.Round((double)item.condition),
                        maxCondition = (int)Math.Round((double)item.maxCondition),
                        skin = item.skin
                    });
                }
            }
            return list;
        }

        private string GetGridString(Vector3 pos)
        {
            try
            {
                const float size = 150f;
                float worldSize = ConVar.Server.worldsize > 0 ? ConVar.Server.worldsize : 4000f;
                int x = Mathf.FloorToInt((pos.x + (worldSize / 2f)) / size);
                int z = Mathf.FloorToInt(((worldSize / 2f) - pos.z) / size);

                string letter = "";
                while (x >= 0)
                {
                    letter = (char)('A' + (x % 26)) + letter;
                    x = (x / 26) - 1;
                }
                return $"{letter}{z}";
            }
            catch
            {
                return "G12";
            }
        }

        #endregion
    }
}
CS; return str_replace( ['%%AUTHOR%%', '%%SERVER_NAME%%', '%%PANEL_URL%%', '%%SERVER_UUID%%'], [$safeAuthor, $safeServerName, $safePanelUrl, $safeServerUuid], $code ); } } 