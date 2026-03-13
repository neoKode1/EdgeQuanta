/**
 * EdgeQuanta Page rendering tests
 * Run: npx vitest run src/__tests__/pages.test.tsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from '../pages/Home';
import Docs from '../pages/Docs';
import Contact from '../pages/Contact';

// Mock fetch globally for pages that call API on mount
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ systems: [], jobs: [], keys: [], reservations: [], global: {}, }),
  }));
});

describe('Home page', () => {
  it('renders the hero title', () => {
    render(<MemoryRouter><Home /></MemoryRouter>);
    expect(screen.getByText('EDGE QUANTA')).toBeInTheDocument();
  });

  it('renders navigation links to platform pages', () => {
    render(<MemoryRouter><Home /></MemoryRouter>);
    expect(screen.getByText('PLATFORM')).toBeInTheDocument();
    expect(screen.getByText('OBSERVABILITY')).toBeInTheDocument();
    expect(screen.getByText('ACCESS')).toBeInTheDocument();
  });

  it('renders capability features', () => {
    render(<MemoryRouter><Home /></MemoryRouter>);
    expect(screen.getByText('TASK SUBMISSION')).toBeInTheDocument();
    expect(screen.getByText('SYSTEM OBSERVABILITY')).toBeInTheDocument();
    expect(screen.getByText('ACCESS CONTROL')).toBeInTheDocument();
    expect(screen.getByText('MULTI-CHIP SUPPORT')).toBeInTheDocument();
  });

  it('lists all four quantum system types', () => {
    render(<MemoryRouter><Home /></MemoryRouter>);
    expect(screen.getByText('SUPERCONDUCTING')).toBeInTheDocument();
    expect(screen.getByText('ION TRAP')).toBeInTheDocument();
    expect(screen.getByText('NEUTRAL ATOM')).toBeInTheDocument();
    expect(screen.getByText('PHOTONIC')).toBeInTheDocument();
  });
});

describe('Docs page', () => {
  it('renders protocol documentation cards', () => {
    render(<MemoryRouter><Docs /></MemoryRouter>);
    expect(screen.getByText('bitquanta.md')).toBeInTheDocument();
    expect(screen.getByText('README.md')).toBeInTheDocument();
    expect(screen.getByText('ROOT.md')).toBeInTheDocument();
  });

  it('lists protocol capabilities', () => {
    render(<MemoryRouter><Docs /></MemoryRouter>);
    expect(screen.getByText('Submit and track quantum tasks')).toBeInTheDocument();
  });
});

describe('Contact page', () => {
  it('renders audience cards', () => {
    render(<MemoryRouter><Contact /></MemoryRouter>);
    expect(screen.getByText('For hardware operators')).toBeInTheDocument();
    expect(screen.getByText('For research groups')).toBeInTheDocument();
    expect(screen.getByText('For enterprise R&D')).toBeInTheDocument();
  });
});

