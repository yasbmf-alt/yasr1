import React from 'react';
import { Cartas } from './Cartas';
import { Cantinho } from './Cantinho';
import { Mimos, Pote, Retrospectiva, Rotacoes } from './Extras';

export interface RoomView {
  title: string;
  render: () => React.ReactNode;
}

/** Ambientes do quarto além da gaveta, estante e mural. */
export const ROOM_EXTRA: Record<string, RoomView> = {
  mesa: { title: 'Cantinho de concentração', render: () => <Cantinho /> },
  cartas: { title: 'Cartinhas para a Yas do futuro', render: () => <Cartas /> },
  pote: { title: 'Pote de conquistas', render: () => <Pote /> },
  calendario: { title: 'Retrospectiva do mês', render: () => <Retrospectiva /> },
  rotacoes: { title: 'Rotações do internato', render: () => <Rotacoes /> },
  mimos: { title: 'Meus mimos', render: () => <Mimos /> },
};
