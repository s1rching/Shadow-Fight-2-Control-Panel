# Shadow Fight 2 – Custom Cheat Panel

## Overview

The Shadow Fight 2 Custom Cheat Panel is a Tampermonkey userscript that adds an in-game control panel to Shadow Fight 2. It provides controls for battles, fighter health, damage, resources, equipment, enchantments, energy, player stats, timers, progression, achievements, and profile backups.

The panel interacts with the game's existing objects and functions rather than simply changing text displayed on the screen. Some changes are applied to the active game state, while others are saved to the player's game profile.

The script targets the captured **Shadow Fight 2** game bundle. If the game updates and changes its internal code, some features may stop working until the script is updated.

---

## 1. Battle

The Battle section contains controls that can be used during an active fight.

### Player and opponent controls
- **Toggle player invincibility:** Turns the player's damage immunity on or off.
- **Toggle opponent invincibility:** Turns the opponent's damage immunity on or off.
- **Disable opponent invincibility:** Explicitly turns off the opponent's damage immunity.
- **Force opponent knockdown:** Requests a knockdown of the opponent through the game's battle system.
- **Restart current fight:** Restarts the active fight from the beginning, after confirmation.
- **Pause / resume fight:** Pauses or resumes the current fight.

### Fighter health

The health controls allow you to edit either fighter's health.

First, select **Player** or **Opponent**. Then use the percentage slider to set that fighter's health from 0% to 100%.

Available buttons:
- **Refill selected health:** Restores the selected fighter to maximum health.
- **Empty selected health:** Sets the selected fighter's health to zero.
- **Refresh health:** Reads the current health from the game and updates the display.

The panel displays the selected fighter's current health, maximum health, and percentage.

The health slider uses percentage values rather than raw health units, allowing it to work with fighters whose maximum health is represented differently by the game.

---

## 2. Damage Controls

This section modifies damage dealt to the opponent.

### Damage multiplier
Enter a whole-number multiplier from **1× to 1,000×**, then click **Set multiplier**.

The multiplier increases negative health changes applied to the opponent. It does not intentionally increase damage received by the player.

### One-hit mode
**Toggle one-hit mode** enables or disables an experimental mode that greatly amplifies the player's damage to the opponent through the game's health handler.

### Disable damage boost
Turns off both the damage multiplier and one-hit mode.

**Note:** One-hit mode is experimental. Its behavior should be checked in a normal fight before relying on it.

---

## 3. Resources

The Resources section lets you add gold and gems.

- **Add gold:** Enter an amount and add it to your account.
- **Add gems:** Enter an amount and add it to your account.
- **+1M gold +1M gems:** Adds 1,000,000 gold and 1,000,000 gems.

These controls call the game's resource functions.

---

## 4. Equipment

The Equipment section lets you select and modify individual equipment items.

### Equipment categories

You can choose from:
- Weapon
- Armor
- Helmet
- Ranged weapon
- Magic

After selecting a category, choose an item from the game's catalog. The panel displays whether the item is owned, whether it is equipped, its current upgrade level, and its next available upgrade level when available.

### Upgrade selected item
Advances the selected owned item by one available upgrade tier.

### Set selected item level
Allows you to enter an exact whole-number equipment level instead of upgrading one tier at a time.

The input accepts levels from 0 up to the level limit provided by the game.

Both upgrade controls work with owned items whether they are equipped or unequipped.

### Equip Only
Attempts to equip the selected item without acquiring or unlocking it.

This is deliberately separate from acquisition. If the game rejects an item that is not owned, it may revert.

### Acquire / unlock only
Acquires the selected item without equipping it.

This is useful when you want to own an item but do not want to use it immediately.

**Important:** Acquiring, equipping, and changing an item's level are separate actions. The panel does not intentionally combine them.

---

## 5. Enchantments

The Enchantments section allows you to apply an enchantment to an item already in your inventory.

1. Select an owned item.
2. Select an available enchantment.
3. Click **Apply enchantment**.

The item must already exist in your inventory. Applying an enchantment does not acquire or equip the item.

Existing enchantments are retained unless the game replaces an incompatible one.

**Refresh item lists** refreshes both the equipment and enchantment item lists.

---

## 6. Energy

The Energy section provides controls for the player's energy.

### Set energy
Enter a whole-number energy amount and click **Set energy**.

The panel displays current energy and maximum energy.

### Skip energy refill
Refills energy to its maximum and removes the need to wait for the current refill countdown.

### Infinite energy
The **Infinite energy: ON/OFF** toggle prevents energy costs from being deducted while enabled.

The ON/OFF preference is saved in the panel's browser storage and restored when the userscript runs again.

This is a runtime effect, not a permanent modification to the game:
- Reloading the game with the userscript enabled restores the saved ON/OFF preference.
- Disabling or removing the userscript prevents it from installing the effect on the next page load.
- If the script is disabled while the game page is already open, reload the page to remove the currently installed runtime hook.

The section also displays the energy refill countdown and the Starter Pack offer countdown. The Starter Pack countdown is display-only.

---

## 7. Individual Stats

This section allows you to edit individual player stats.

Select a stat from the list to see its current value and whether it has a custom override.

### Set stat value
Enter a new value and click **Set stat value**.

The game recalculates the player's stat model after the override is applied.

### Reset selected stat
Removes the selected stat's custom override and recalculates it using the player's current level, equipment, and other game modifiers.

