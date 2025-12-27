
import { Component, inject, ElementRef, viewChild, effect, output } from '@angular/core';
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
           <button (click)="historyService.clearHistory()" class="text-sm font-bold text-white bg-[#1D1C1C] px-4 py-2 border-2 border-transparent hover:bg-red-600 transition-colors uppercase">
             Effacer tout
           </button>
         }
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
         <div class="bg-white p-6 border-2 border-[#1D1C1C] wero-shadow relative">
            <h3 class="text-xs font-bold text-[#1D1C1C] uppercase tracking-wider mb-2 bg-[#FFF48D] inline-block px-1">Total Parties</h3>
            <p class="text-5xl font-black text-[#1D1C1C] mt-2">{{ stats().wins + stats().losses + stats().draws }}</p>
         </div>

         <div class="bg-white p-6 border-2 border-[#1D1C1C] wero-shadow relative">
            <h3 class="text-xs font-bold text-[#1D1C1C] uppercase tracking-wider mb-2 bg-[#7AF7F7] inline-block px-1">Victoires</h3>
            <div class="flex items-end space-x-2 mt-2">
               <p class="text-5xl font-black text-[#1D1C1C]">{{ stats().wins }}</p>
               <span class="text-gray-500 font-bold mb-1 text-lg">/ {{ stats().wins + stats().losses + stats().draws }}</span>
            </div>
         </div>

         <div class="bg-white p-6 border-2 border-[#1D1C1C] wero-shadow flex flex-col items-center justify-center">
             <h3 class="text-xs font-bold text-[#1D1C1C] uppercase tracking-wider mb-2 w-full text-left">Répartition</h3>
             <div #chartContainer class="w-full h-32 flex items-center justify-center"></div>
         </div>
      </div>

      <!-- Games List -->
      <div class="bg-white border-2 border-[#1D1C1C] wero-shadow">
        <div class="px-6 py-4 border-b-2 border-[#1D1C1C] bg-[#FFF48D]">
           <h3 class="font-black text-[#1D1C1C] uppercase tracking-wide text-lg">Journal des matchs</h3>
        </div>
        
        @if (historyService.history().length === 0) {
            <div class="p-12 text-center text-gray-400 font-medium italic border-2 border-dashed border-gray-200 m-4">
                Aucune donnée. Jouez votre première partie !
            </div>
        }

        <div class="divide-y-2 divide-[#1D1C1C]">
          @for (game of historyService.history(); track game.id) {
            <div class="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors group">
               
               <div class="flex items-center space-x-4">
                  <img [src]="game.opponentAvatar" class="w-12 h-12 border-2 border-[#1D1C1C] bg-white group-hover:scale-110 transition-transform">
                  <div>
                     <p class="font-black text-[#1D1C1C] text-lg uppercase">{{ game.opponentName }}</p>
                     <p class="text-xs font-mono font-bold text-gray-500">{{ game.opponentRating }} Elo • {{ game.date | date:'short' }}</p>
                  </div>
               </div>

               <div class="flex items-center space-x-4">
                   @switch (game.result) {
                       @case ('win') {
                           <span class="px-4 py-1 bg-[#1D1C1C] text-[#FFF48D] text-sm font-black uppercase border-2 border-[#1D1C1C]">Victoire</span>
                       }
                       @case ('loss') {
                           <span class="px-4 py-1 bg-white text-[#1D1C1C] text-sm font-black uppercase border-2 border-[#1D1C1C]">Défaite</span>
                       }
                       @case ('draw') {
                           <span class="px-4 py-1 bg-gray-200 text-gray-600 text-sm font-black uppercase border-2 border-gray-400">Nulle</span>
                       }
                   }
                   <button (click)="review.emit(game.id)" class="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1 border-2 border-[#1D1C1C] text-[10px] font-black uppercase hover:bg-[#7AF7F7]">
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
export class HistoryComponent {
  historyService = inject(HistoryService);
  chartContainer = viewChild<ElementRef>('chartContainer');
  
  review = output<string>();

  stats = this.historyService.getStats.bind(this.historyService);

  constructor() {
    effect(() => {
        // Redraw chart when history changes
        const data = this.historyService.history();
        const el = this.chartContainer()?.nativeElement;
        if (el && data.length > 0) {
            this.renderChart(el);
        }
    });
  }

  renderChart(element: HTMLElement) {
    // Cast d3 to any to avoid type errors
    const d3Any: any = d3;

    // Clean previous
    d3Any.select(element).selectAll('*').remove();

    const stats = this.stats();
    if (stats.wins + stats.losses + stats.draws === 0) return;

    const width = 200;
    const height = 128;
    const radius = Math.min(width, height) / 2;

    const svg = d3Any.select(element)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    // Wero Palette for Chart
    const color = d3Any.scaleOrdinal()
      .domain(['wins', 'losses', 'draws'])
      .range(['#FFF48D', '#1D1C1C', '#d1d5db']); // Yellow Wins, Black Losses

    const pie = d3Any.pie()
      .value((d: any) => d.value)
      .sort(null);

    const dataReady = pie([
        { key: 'wins', value: stats.wins },
        { key: 'losses', value: stats.losses },
        { key: 'draws', value: stats.draws }
    ]);

    const arc = d3Any.arc()
      .innerRadius(radius * 0.5) // Donut chart
      .outerRadius(radius);

    svg.selectAll('path')
      .data(dataReady)
      .enter()
      .append('path')
      .attr('d', arc)
      .attr('fill', (d: any) => color(d.data.key))
      .attr('stroke', '#1D1C1C')
      .style('stroke-width', '2px');
      
    // Add text in center
    svg.append("text")
       .attr("text-anchor", "middle")
       .attr("dy", "0.3em")
       .attr("font-size", "16px")
       .attr("font-weight", "900")
       .attr("fill", "#1D1C1C")
       .text(`${stats.winRate}%`);
  }
}
