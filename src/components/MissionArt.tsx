// Ícone da estação de uma missão (trilha, painel e modo prova).
import React from 'react';
import { Asset } from '../assets/registry';
import { InternatoThemeIcon, SimMissionIcon, StationIcon } from '../assets/art';
import type { Area, Mission } from '../types';

export function MissionArt({ m, area }: { m: Mission; area: Area }) {
  if (m.kind === 'simulado') return <SimMissionIcon task={m.simTask ?? 'fazer'} />;
  if (m.kind === 'internato') {
    const th = m.theme ?? 'hospital';
    if (th === 'hospital') return <Asset slot="trail.station.internato" />;
    if (th === 'psiquiatria' || th === 'emergencia' || th === 'simulacao' || th === 'ambulatorio') return <InternatoThemeIcon theme={th} />;
    return <StationIcon area={th} />;
  }
  return <Asset slot={`trail.station.${area}`} />;
}
