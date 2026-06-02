from PIL import Image
import numpy as np
from scipy import ndimage

img = Image.open("originalIcons.webp").convert("RGB")
arr = np.array(img)
h_img, w_img = arr.shape[:2]
print(f"Image: {w_img}x{h_img}")

bg = arr[10, 10].astype(int)
THRESHOLD = 28   # min color diff to count as content
PADDING   = 22   # whitespace added around content bounds
# Components whose center-of-mass is within EDGE_GUARD px of a cell
# boundary are treated as bleed from the neighboring icon.
EDGE_GUARD = 8

cell_w = w_img // 4
cell_h = h_img // 3

names = [
    "mail-notification", "mail-contact",  "mail-analytics", "mail-alert",
    "mail-fast",         "mail-share",    "mail-split",     "mail-sync",
    "mail-exchange",     "mail-pending",  "mail-receive",   "mail-starred",
]

for idx, name in enumerate(names):
    col = idx % 4
    row = idx // 4
    x0, y0 = col * cell_w, row * cell_h
    x1, y1 = x0 + cell_w, y0 + cell_h

    cell = arr[y0:y1, x0:x1]
    diff = np.max(np.abs(cell.astype(int) - bg), axis=2)
    mask = diff > THRESHOLD

    if not mask.any():
        print(f"  [{name}] no content found!")
        continue

    labeled, n = ndimage.label(mask)
    sizes = ndimage.sum(mask, labeled, range(1, n + 1))

    # Keep components whose center-of-mass is well inside the cell
    kept_cols, kept_rows = [], []
    for lbl in range(1, n + 1):
        comp = labeled == lbl
        cy_com, cx_com = ndimage.center_of_mass(comp)
        # cx_com/cy_com are in cell-local coords
        if (cx_com < EDGE_GUARD or cx_com > (cell_w - EDGE_GUARD) or
                cy_com < EDGE_GUARD or cy_com > (cell_h - EDGE_GUARD)):
            continue  # discard as bleed
        cols_idx = np.where(np.any(comp, axis=0))[0]
        rows_idx = np.where(np.any(comp, axis=1))[0]
        kept_cols.extend([int(cols_idx[0]), int(cols_idx[-1])])
        kept_rows.extend([int(rows_idx[0]), int(rows_idx[-1])])

    if not kept_cols:
        # Fallback: use largest component (all components were edge-touching)
        largest = int(np.argmax(sizes)) + 1
        comp = labeled == largest
        cols_idx = np.where(np.any(comp, axis=0))[0]
        rows_idx = np.where(np.any(comp, axis=1))[0]
        kept_cols = [int(cols_idx[0]), int(cols_idx[-1])]
        kept_rows = [int(rows_idx[0]), int(rows_idx[-1])]

    c0, c1 = min(kept_cols), max(kept_cols)  # cell-local
    r0, r1 = min(kept_rows), max(kept_rows)

    # Absolute image coordinates
    abs_x0, abs_x1 = x0 + c0, x0 + c1
    abs_y0, abs_y1 = y0 + r0, y0 + r1

    # Padded crop, clamped to cell
    cx0 = max(x0, abs_x0 - PADDING)
    cy0 = max(y0, abs_y0 - PADDING)
    cx1 = min(x1, abs_x1 + PADDING)
    cy1 = min(y1, abs_y1 + PADDING)

    # Make square, centered, clamped to cell
    cw, ch = cx1 - cx0, cy1 - cy0
    side = max(cw, ch)
    cx_c = (cx0 + cx1) // 2
    cy_c = (cy0 + cy1) // 2
    sx0 = max(x0, cx_c - side // 2)
    sy0 = max(y0, cy_c - side // 2)
    sx1 = min(x1, sx0 + side)
    sy1 = min(y1, sy0 + side)

    cropped = img.crop((sx0, sy0, sx1, sy1)).resize((400, 400), Image.LANCZOS)
    cropped.save(f"{name}.png", "PNG")
    print(f"  ✓ {name}.png  content=({abs_x0},{abs_y0})-({abs_x1},{abs_y1})  crop=({sx0},{sy0})-({sx1},{sy1})")

print("\nDone.")
