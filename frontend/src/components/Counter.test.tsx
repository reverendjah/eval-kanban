import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Counter } from './Counter';

describe('Counter', () => {
  beforeEach(() => {
    cleanup();
  });

  it('renders with default initial value of 0', () => {
    render(<Counter />);
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('renders with custom initial value', () => {
    render(<Counter initialValue={10} />);
    expect(screen.getByText('10')).toBeTruthy();
  });

  it('increments the count when + button is clicked', () => {
    render(<Counter />);
    const incrementButton = screen.getByLabelText('Incrementar');

    fireEvent.click(incrementButton);
    expect(screen.getByText('1')).toBeTruthy();

    fireEvent.click(incrementButton);
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('decrements the count when - button is clicked', () => {
    render(<Counter initialValue={5} />);
    const decrementButton = screen.getByLabelText('Decrementar');

    fireEvent.click(decrementButton);
    expect(screen.getByText('4')).toBeTruthy();

    fireEvent.click(decrementButton);
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('respects custom step value', () => {
    render(<Counter step={5} />);
    const incrementButton = screen.getByLabelText('Incrementar');

    fireEvent.click(incrementButton);
    expect(screen.getByText('5')).toBeTruthy();

    fireEvent.click(incrementButton);
    expect(screen.getByText('10')).toBeTruthy();
  });

  it('does not go below min value', () => {
    render(<Counter initialValue={1} min={0} />);
    const decrementButton = screen.getByLabelText('Decrementar');

    fireEvent.click(decrementButton);
    expect(screen.getByText('0')).toBeTruthy();

    fireEvent.click(decrementButton);
    expect(screen.getByText('0')).toBeTruthy();
    expect(decrementButton.hasAttribute('disabled')).toBe(true);
  });

  it('does not go above max value', () => {
    render(<Counter initialValue={9} max={10} />);
    const incrementButton = screen.getByLabelText('Incrementar');

    fireEvent.click(incrementButton);
    expect(screen.getByText('10')).toBeTruthy();

    fireEvent.click(incrementButton);
    expect(screen.getByText('10')).toBeTruthy();
    expect(incrementButton.hasAttribute('disabled')).toBe(true);
  });

  it('disables decrement button when at min', () => {
    render(<Counter initialValue={0} min={0} />);
    const decrementButton = screen.getByLabelText('Decrementar');
    expect(decrementButton.hasAttribute('disabled')).toBe(true);
  });

  it('disables increment button when at max', () => {
    render(<Counter initialValue={10} max={10} />);
    const incrementButton = screen.getByLabelText('Incrementar');
    expect(incrementButton.hasAttribute('disabled')).toBe(true);
  });
});
