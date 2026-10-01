"""Extract the licensed small-seal 光 outline into a full-bleed app icon."""

import sys
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont


def main() -> None:
    font = TTFont(sys.argv[1])
    glyph_set = font.getGlyphSet()
    glyph = glyph_set[font.getBestCmap()[ord("光")]]
    bounds_pen = BoundsPen(glyph_set)
    glyph.draw(bounds_pen)
    x_min, y_min, x_max, y_max = bounds_pen.bounds
    scale = min(620 / (x_max - x_min), 780 / (y_max - y_min))
    x = 512 - scale * (x_min + x_max) / 2
    y = 512 + scale * (y_min + y_max) / 2
    path_pen = SVGPathPen(glyph_set)
    glyph.draw(path_pen)
    path = path_pen.getCommands()
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <title>光域新能会议室</title>
  <desc>小篆「光」。字形来源：数位发展部 CNS11643 中文标准交换码全字库，全字庫說文解字 TrueType 字型 Version 001.000；依政府资料开放授权条款第 1 版使用。https://www.cns11643.gov.tw</desc>
  <rect width="1024" height="1024" fill="#123b35"/>
  <g transform="translate({x:.3f} {y:.3f}) scale({scale:.6f} {-scale:.6f})" fill="#f7f3e7">
    <path d="{path}"/>
  </g>
</svg>
'''
    Path(__file__).with_name("app-icon.svg").write_text(svg, encoding="utf-8")


if __name__ == "__main__":
    main()
