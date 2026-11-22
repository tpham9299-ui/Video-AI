// v92 — hiện chuỗi chữ trộn công thức: cụm toán dựng bằng KaTeX (Toan), cụm chữ giữ phông Be Vietnam -> không lọt mã thô.
import React from 'react';
import {Toan} from '../Toan';
import {tachChuToan} from './chu_tron';

export const ChuTron: React.FC<{s: string; co: number; mau: string; hoa?: (x: string) => string; dam?: number}> = ({s, co, mau, hoa, dam = 800}) => (
  <>
    {tachChuToan(s).map((c, i) =>
      c.tex ? (
        <span key={i} style={{display: 'inline-block', margin: '0 0.18em', verticalAlign: 'baseline'}}>
          <Toan tex={c.s} size={co} color={mau} style={{fontWeight: dam}} />
        </span>
      ) : (
        <span key={i}>{hoa ? hoa(c.s) : c.s}</span>
      )
    )}
  </>
);
