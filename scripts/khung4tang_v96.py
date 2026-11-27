#!/usr/bin/env python3
"""Wrapper tương thích ngược -> scripts/khung4tang/{san_khau,kiem_tra}.py (v96)."""
import os as _os
import sys as _sys

_DIR = _os.path.dirname(_os.path.abspath(__file__))
if _DIR not in _sys.path:
    _sys.path.insert(0, _DIR)

from khung4tang.san_khau import *  # noqa: F401,F403
import khung4tang.san_khau as _m_san_khau
for _k in dir(_m_san_khau):
    if not _k.startswith('__') and _k not in globals():
        globals()[_k] = getattr(_m_san_khau, _k)
from khung4tang.kiem_tra import *  # noqa: F401,F403
import khung4tang.kiem_tra as _m_kiem_tra
for _k in dir(_m_kiem_tra):
    if not _k.startswith('__') and _k not in globals():
        globals()[_k] = getattr(_m_kiem_tra, _k)
