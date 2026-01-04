import {
  Component,
  inject,
  ElementRef,
  viewChild,
  effect,
  output,
  OnInit,
  OnDestroy
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HistoryService } from '../services/history.service';
import * as d3 from 'd3';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <div class="max-w-6xl mx-auto p-6 mt-4 font-['Inter']">
      <div class="flex items-center justify-between mb-8 border-b-2 border-[#1D1C1C] pb-4">
        <h2 class="text-4xl font-black text-[#1D1C1C] flex items-center uppercase tracking-tighter">
          Historique
        </h2>
        @if (historyService.history().length > 0) {
          <button
            (click)="historyService.clearHistory()"
            class="ui-btn ui-btn-dark text-sm px-4 py-2"
          >
            Effacer tout
          </button>
        }
      </div>

      @if (historyService.error()) {
        <div class="mb-6 p-4 border-2 border-red-200 bg-red-50 text-red-700 flex items-center justify-between">
          <span class="font-bold">{{ historyService.error() }}</span>
          <button (click)="historyService.fetchHistoryFromSupabase()" class="ui-btn ui-btn-secondary text-xs">
            Réessayer
          </button>
        </div>
      }

      @if (historyService.loading()) {
        <div class="mb-6 flex items-center text-sm text-gray-600 font-bold">
          <span class="w-3 h-3 mr-2 rounded-full border-2 border-[#1D1C1C] border-t-transparent animate-spin"></span>
          Mise à jour de l'historique...
        </div>
      }

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="ui-card p-6 relative">
          <h3
            class="text-xs font-bold text-[#1D1C1C] uppercase tracking-wider mb-2 bg-[#FFF48D] inline-block px-1"
          >
            Total Parties
          </h3>
          <p class="text-5xl font-black text-[#1D1C1C] mt-2">
            {{ stats().wins + stats().losses + stats().draws }}
          </p>
        </div>

        <div class="ui-card p-6 relative">
          <h3
            class="text-xs font-bold text-[#1D1C1C] uppercase tracking-wider mb-2 bg-[#7AF7F7] inline-block px-1"
          >
            Victoires
          </h3>
          <div class="flex items-end space-x-2 mt-2">
            <p class="text-5xl font-black text-[#1D1C1C]">{{ stats().wins }}</p>
            <span class="text-gray-500 font-bold mb-1 text-lg"
              >/ {{ stats().wins + stats().losses + stats().draws }}</span
            >
          </div>
        </div>

        <div class="ui-card p-6 flex flex-col items-center justify-center">
          <h3
            class="text-xs font-bold text-[#1D1C1C] uppercase tracking-wider mb-2 w-full text-left"
          >
            Répartition
          </h3>
          <div #chartContainer class="w-full h-32 flex items-center justify-center"></div>
        </div>

        <div class="ui-card p-6 flex flex-col justify-between">
          <div>
            <h3
              class="text-xs font-bold text-[#1D1C1C] uppercase tracking-wider mb-2 w-full text-left"
            >
              Hydra (+3 / +1 / -1)
            </h3>
            <p class="text-4xl font-black text-[#1D1C1C]">{{ hydraStats().totalPoints }}</p>
          </div>
          <div class="flex justify-between text-xs font-bold text-gray-500 mt-4">
            <span class="px-2 py-1 bg-green-100 border border-green-200 text-green-700"
              >{{ hydraStats().wins }} V</span
            >
            <span class="px-2 py-1 bg-gray-100 border border-gray-200 text-gray-700"
              >{{ hydraStats().draws }} N</span
            >
            <span class="px-2 py-1 bg-red-100 border border-red-200 text-red-700"
              >{{ hydraStats().losses }} D</span
            >
          </div>
        </div>
      </div>

      <!-- Games List -->
      <div class="ui-card">
        <div class="ui-card-header px-6 py-4">
          <h3 class="font-black text-[#1D1C1C] uppercase tracking-wide text-lg">
            Journal des matchs
          </h3>
        </div>

        @if (historyService.history().length === 0 && !historyService.loading()) {
          <div
            class="p-12 text-center text-gray-400 font-medium italic border-2 border-dashed border-gray-200 m-4"
          >
            Aucune donnée. Jouez votre première partie !
          </div>
        }

        <div class="divide-y-2 divide-[#1D1C1C]">
          @for (game of historyService.history(); track game.id) {
            <div
              class="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors group"
            >
              <div class="flex items-center space-x-4">
                <img
                  [src]="game.opponentAvatar"
                  class="w-12 h-12 border-2 border-[#1D1C1C] bg-white group-hover:scale-110 transition-transform"
                />
                <div>
                  <p class="font-black text-[#1D1C1C] text-lg uppercase">{{ game.opponentName }}</p>
                  <p class="text-xs font-mono font-bold text-gray-500">
                    {{ game.opponentRating }} Elo • {{ game.date | date: 'short' }}
                  </p>
                </div>
              </div>

              <div class="flex items-center space-x-4">
                @switch (game.result) {
                  @case ('win') {
                    <span
                      class="px-4 py-1 bg-[#1D1C1C] text-[#FFF48D] text-sm font-black uppercase border-2 border-[#1D1C1C]"
                      >Victoire</span
                    >
                  }
                  @case ('loss') {
                    <span
                      class="px-4 py-1 bg-white text-[#1D1C1C] text-sm font-black uppercase border-2 border-[#1D1C1C]"
                      >Défaite</span
                    >
                  }
                  @case ('draw') {
                    <span
                      class="px-4 py-1 bg-gray-200 text-gray-600 text-sm font-black uppercase border-2 border-gray-400"
                      >Nulle</span
                    >
                  }
                }
                <span
                  class="px-2 py-1 border-2 border-[#1D1C1C] text-xs font-black"
                  [class.bg-green-100]="game.hydraPoints > 0"
                  [class.bg-red-100]="game.hydraPoints < 0"
                  [class.bg-gray-100]="game.hydraPoints === 0"
                  >{{ game.hydraPoints > 0 ? '+' : '' }}{{ game.hydraPoints }} pts</span
                >
                <button
                  (click)="review.emit(game.id)"
                  class="ui-btn ui-btn-secondary opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1 text-[10px]"
                >
                  Analyser
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class HistoryComponent implements OnInit, OnDestroy {
  historyService = inject(HistoryService);
  chartContainer = viewChild<ElementRef>('chartContainer');

  review = output<string>();

  stats = this.historyService.stats;
  hydraStats = this.historyService.hydraStats;

  constructor() {
    effect(() => {
      // Redraw chart when history changes
      const data = this.historyService.history();
      const el = this.chartContainer()?.nativeElement;
      if (el) {
        this.renderChart(el, data.length > 0);
      }
    });
  }

  ngOnInit() {
    void this.historyService.fetchHistoryFromSupabase();
  }

  ngOnDestroy() {
    void this.historyService.teardownRealtime();
  }

  renderChart(element: HTMLElement, hasData: boolean) {
    // Cast d3 to any to avoid type errors
    const d3Any: any = d3;

    // Clean previous
    d3Any.select(element).selectAll('*').remove();

    const stats = this.stats();
    if (!hasData || stats.wins + stats.losses + stats.draws === 0) return;

    const width = 200;
    const height = 128;
    const radius = Math.min(width, height) / 2;

    const svg = d3Any
      .select(element)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    // Wero Palette for Chart
    const color = d3Any
      .scaleOrdinal()
      .domain(['wins', 'losses', 'draws'])
      .range(['#FFF48D', '#1D1C1C', '#d1d5db']); // Yellow Wins, Black Losses

    const pie = d3Any
      .pie()
      .value((d: any) => d.value)
      .sort(null);

    const dataReady = pie([
      { key: 'wins', value: stats.wins },
      { key: 'losses', value: stats.losses },
      { key: 'draws', value: stats.draws }
    ]);

    const arc = d3Any
      .arc()
      .innerRadius(radius * 0.5) // Donut chart
      .outerRadius(radius);

    svg
      .selectAll('path')
      .data(dataReady)
      .enter()
      .append('path')
      .attr('d', arc)
      .attr('fill', (d: any) => color(d.data.key))
      .attr('stroke', '#1D1C1C')
      .style('stroke-width', '2px');

    // Add text in center
    svg
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.3em')
      .attr('font-size', '16px')
      .attr('font-weight', '900')
      .attr('fill', '#1D1C1C')
      .text(`${stats.winRate}%`);
  }
}
