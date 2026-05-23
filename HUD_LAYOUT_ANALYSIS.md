# Ravenswatch DQHD HUD Safe-Area Patch

This document records the verified HUD layout patch for moving Ravenswatch left/right HUD groups inward on a 5120x1440 DQHD monitor.

## Target File

```text
C:\Program Files (x86)\Steam\steamapps\common\Ravenswatch\DarkTalesResources\_Cooking\MzidisFqiidzyv\Aqurqv\Aqur_Srxxrz!Aqur_Srxxrz.qzidis.ri.MzidisFqiidzyvLqvrwubq.yqz
```

Backups created during analysis:

```text
Aqur_Srxxrz!Aqur_Srxxrz.qzidis.ri.MzidisFqiidzyvLqvrwubq.yqz.bak_minimap_x_test_original
Aqur_Srxxrz!Aqur_Srxxrz.qzidis.ri.MzidisFqiidzyvLqvrwubq.yqz.bak_before_hud_right_parent_test
Aqur_Srxxrz!Aqur_Srxxrz.qzidis.ri.MzidisFqiidzyvLqvrwubq.yqz.bak_before_final_safe_area_test
```

Use `bak_before_final_safe_area_test` to restore the file state immediately before the final left/right HUD patch.

## Confirmed Record Format

Relevant UI records begin with:

```text
22 22 BB AA 11 11 BB AA
```

For the HUD frame records used here:

```text
record marker + 14 = X position
record marker + 18 = Y position
record marker + 25 = width
record marker + 29 = height
record marker + 35 = X pivot / alignment
record marker + 39 = Y pivot / alignment
```

The floats are best handled relative to the record marker. Do not assume global 4-byte file alignment.

## Original Parent Frame Values

Left HUD parent:

```text
Element: HUD_Frame_Left
record marker: 0x00103C9D
label offset:   0x00103CEA

marker + 14 = 0.5
marker + 18 = 0.5
marker + 25 = 1.0
marker + 29 = 1.0
marker + 35 = 0.5
marker + 39 = 0.5
```

Right HUD parent:

```text
Element: HUD_Frame_Right
record marker: 0x001098B7
label offset:   0x00109910

marker + 14 = 0.5
marker + 18 = 0.5
marker + 25 = 1.0
marker + 29 = 1.0
marker + 35 = 0.5
marker + 39 = 0.5
```

Only `marker + 14` was changed for each parent frame.

## Applied Patch

The monitor resolution is 5120x1440. A centered 16:9 safe area has:

```text
safe width = 1440 * 16 / 9 = 2560
side inset = (5120 - 2560) / 2 = 1280 px
normalized inset = 1280 / 1440 = 0.8888889
```

Final verified values:

```text
HUD_Frame_Left
offset: 0x00103CAB
field:  record marker + 14
0.5 -> 1.3888889
bytes: 00 00 00 3F -> 1D C7 B1 3F

HUD_Frame_Right
offset: 0x001098C5
field:  record marker + 14
0.5 -> -0.3888889
bytes: 00 00 00 3F -> 72 1C C7 BE
```

Calculation:

```text
left  = 0.5 + 0.8888889 = 1.3888889
right = 0.5 - 0.8888889 = -0.3888889
```

Observed result:

```text
Both left and right HUD groups moved inward as intended.
The movement applies to the whole parent HUD group, not just individual elements.
```

## Rollback

To manually restore the original HUD parent positions:

```text
0x00103CAB = 0.5
bytes = 00 00 00 3F

0x001098C5 = 0.5
bytes = 00 00 00 3F
```

Or restore this backup:

```text
DarkTalesResources\_Cooking\MzidisFqiidzyv\Aqurqv\Aqur_Srxxrz!Aqur_Srxxrz.qzidis.ri.MzidisFqiidzyvLqvrwubq.yqz.bak_before_final_safe_area_test
```

## Reference Offsets

Useful related labels in the same layout file:

```text
0x00103CEA  HUD_Frame_Left
0x001065A4  HUD_Frame_Center
0x00109910  HUD_Frame_Right
0x00109968  Time_Elements
0x001099CA  Minimap_Frame
0x00109B51  Consumables_Frame
0x00109BBF  Dream_Shards_Frame
0x00109CF8  Key_Frame
```

## Verification Script

Run from the Ravenswatch install directory:

```powershell
@'
import pathlib, struct

p = pathlib.Path(r'DarkTalesResources/_Cooking/MzidisFqiidzyv/Aqurqv/Aqur_Srxxrz!Aqur_Srxxrz.qzidis.ri.MzidisFqiidzyvLqvrwubq.yqz')
data = p.read_bytes()

for name, off in [
    ('HUD_Frame_Left marker+14', 0x00103CAB),
    ('HUD_Frame_Right marker+14', 0x001098C5),
]:
    b = data[off:off+4]
    print(f'{name}: offset=0x{off:08X} bytes={b.hex(" ")} float={struct.unpack("<f", b)[0]}')
'@ | python -
```
