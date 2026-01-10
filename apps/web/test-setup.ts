import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';

TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());

// Mock Worker for Stockfish
class MockWorker implements Worker {
  onmessage: ((this: Worker, ev: MessageEvent) => any) | null = null;
  onmessageerror: ((this: Worker, ev: MessageEvent) => any) | null = null;
  onerror: ((this: Worker, ev: ErrorEvent) => any) | null = null;
  
  private listeners: Record<string, EventListenerOrEventListenerObject[]> = {};

  constructor(stringUrl: string | URL, options?: WorkerOptions) {}

  postMessage(message: any, transfer: Transferable[]): void;
  postMessage(message: any, options?: StructuredSerializeOptions): void;
  postMessage(message: any, optionsOrTransfer?: any): void {
      const msg = message as string;
      // Simulate async response
      setTimeout(() => {
          if (msg === 'uci') {
              this.dispatchEvent(new MessageEvent('message', { data: 'id name Stockfish 16' }));
              this.dispatchEvent(new MessageEvent('message', { data: 'uciok' }));
          } else if (msg === 'isready') {
              this.dispatchEvent(new MessageEvent('message', { data: 'readyok' }));
          } else if (msg.startsWith('go depth')) {
              this.dispatchEvent(new MessageEvent('message', { data: 'bestmove e2e4' }));
          }
      }, 0);
  }

  terminate() {}

  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void {
     if (!this.listeners[type]) {
         this.listeners[type] = [];
     }
     this.listeners[type].push(listener);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void {
      if (!this.listeners[type]) return;
      const index = this.listeners[type].indexOf(listener);
      if (index !== -1) {
          this.listeners[type].splice(index, 1);
      }
  }

  dispatchEvent(event: Event): boolean {
    const type = event.type;
    if (this.listeners[type]) {
        this.listeners[type].forEach(l => {
            if (typeof l === 'function') {
                l.call(this, event);
            } else {
                l.handleEvent(event);
            }
        });
    }
    if (type === 'message' && this.onmessage) {
        this.onmessage.call(this, event as MessageEvent);
    }
    return true;
  }
}

// @ts-ignore
global.Worker = MockWorker;
