import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';

TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());

// Mock Worker for Stockfish tests. No actual background worker is started.
class MockWorker implements Worker {
  onmessage: Worker['onmessage'] = null;
  onmessageerror: Worker['onmessageerror'] = null;
  onerror: Worker['onerror'] = null;

  private listeners: Record<string, EventListenerOrEventListenerObject[]> = {};

  // A Worker constructor may receive a script URL and options; JavaScript
  // ignores those arguments for this mock's zero-argument constructor.
  postMessage(message: unknown): void {
    if (typeof message !== 'string') return;
    setTimeout(() => {
      if (message === 'uci') {
        this.dispatchEvent(new MessageEvent('message', { data: 'id name Stockfish 16' }));
        this.dispatchEvent(new MessageEvent('message', { data: 'uciok' }));
      } else if (message === 'isready') {
        this.dispatchEvent(new MessageEvent('message', { data: 'readyok' }));
      } else if (message.startsWith('go depth')) {
        this.dispatchEvent(new MessageEvent('message', { data: 'bestmove e2e4' }));
      }
    }, 0);
  }

  terminate(): void {}

  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    (this.listeners[type] ??= []).push(listener);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    const listeners = this.listeners[type];
    if (!listeners) return;
    const index = listeners.indexOf(listener);
    if (index !== -1) listeners.splice(index, 1);
  }

  dispatchEvent(event: Event): boolean {
    this.listeners[event.type]?.forEach((listener) => {
      if (typeof listener === 'function') {
        listener.call(this, event);
      } else {
        listener.handleEvent(event);
      }
    });
    if (event.type === 'message') {
      this.onmessage?.call(this, event as MessageEvent);
    } else if (event.type === 'error') {
      this.onerror?.call(this, event as ErrorEvent);
    } else if (event.type === 'messageerror') {
      this.onmessageerror?.call(this, event as MessageEvent);
    }
    return true;
  }
}

globalThis.Worker = MockWorker;
