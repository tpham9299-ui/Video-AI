#!/usr/bin/env python3
"""Wrapper tương thích ngược -> scripts/khung4tang/moc_thoi_gian.py (v99)."""
import os as _os
import sys as _sys

_DIR = _os.path.dirname(_os.path.abspath(__file__))
if _DIR not in _sys.path:
    _sys.path.insert(0, _DIR)

from khung4tang.moc_thoi_gian import *  # noqa: F401,F403
import khung4tang.moc_thoi_gian as _m_moc_thoi_gian
for _k in dir(_m_moc_thoi_gian):
    if not _k.startswith('__') and _k not in globals():
        globals()[_k] = getattr(_m_moc_thoi_gian, _k)
