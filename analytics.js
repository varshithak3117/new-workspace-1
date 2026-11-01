/**
 * SmartSlope Analytics & Visualization Engine
 * Features Chart.js graphs, Slope Water Savings Calculator, and CSV Export
 */

class SmartSlopeAnalytics {
  constructor() {
    this.moistureChart = null;
    this.waterUsageChart = null;
    this.comparisonChart = null;
  }

  /**
   * Render or update all interactive analytics charts
   */
  renderCharts(land, timeframe = 'day', isDemoMode = true) {
    if (!window.Chart) {
      console.warn("Chart.js not loaded yet");
      return;
    }

    this.renderMoistureTrendChart(land, timeframe, isDemoMode);
    this.renderZoneWaterUsageChart(land, timeframe, isDemoMode);
    this.renderWaterSavingsChart(land, isDemoMode);
    this.updateKpiMetrics(land);
  }

  /**
   * Chart 1: 24-Hour / 7-Day Soil Moisture Trends for Zone 1, 2, and 3
   */
  renderMoistureTrendChart(land, timeframe, isDemoMode) {
    const ctx = document.getElementById('moistureTrendChart');
    if (!ctx) return;

    if (this.moistureChart) {
      this.moistureChart.destroy();
    }

    // Generate readable chronological labels
    const pointsCount = timeframe === 'day' ? 12 : timeframe === 'week' ? 7 : 14;
    const labels = [];
    const now = new Date();

    for (let i = pointsCount - 1; i >= 0; i--) {
      if (timeframe === 'day') {
        const d = new Date(now.getTime() - i * 2 * 3600 * 1000);
        labels.push(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } else {
        const d = new Date(now.getTime() - i * 24 * 3600 * 1000);
        labels.push(d.toLocaleDateString([], { month: 'short', day: 'numeric' }));
      }
    }

    // Zone 1 (Upper Slope) dries fastest, has lower average
    const z1Current = land?.zones?.[0]?.moisture ?? 30;
    const z2Current = land?.zones?.[1]?.moisture ?? 42;
    const z3Current = land?.zones?.[2]?.moisture ?? 58;

    const z1Data = this.generateHistoricalSeries(z1Current, pointsCount, -1.8, 22, 60);
    const z2Data = this.generateHistoricalSeries(z2Current, pointsCount, -1.1, 30, 62);
    const z3Data = this.generateHistoricalSeries(z3Current, pointsCount, +0.6, 45, 75); // accumulates downhill

    this.moistureChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Zone 1 (Upper Slope)',
            data: z1Data,
            borderColor: '#e65100',
            backgroundColor: 'rgba(230, 81, 0, 0.12)',
            borderWidth: 2.5,
            tension: 0.35,
            fill: true,
            pointRadius: 3
          },
          {
            label: 'Zone 2 (Middle Slope)',
            data: z2Data,
            borderColor: '#2e7d32',
            backgroundColor: 'rgba(46, 125, 50, 0.12)',
            borderWidth: 2.5,
            tension: 0.35,
            fill: true,
            pointRadius: 3
          },
          {
            label: 'Zone 3 (Lower Slope)',
            data: z3Data,
            borderColor: '#0288d1',
            backgroundColor: 'rgba(2, 136, 209, 0.12)',
            borderWidth: 2.5,
            tension: 0.35,
            fill: true,
            pointRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { font: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: '600' } }
          },
          tooltip: {
            callbacks: {
              label: (context) => `${context.dataset.label}: ${context.parsed.y}% moisture`
            }
          }
        },
        scales: {
          y: {
            min: 15,
            max: 85,
            title: { display: true, text: 'Soil Moisture (%)', font: { weight: '600' } },
            grid: { color: 'rgba(0,0,0,0.06)' }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  }

  /**
   * Chart 2: Water Consumption per Zone
   */
  renderZoneWaterUsageChart(land, timeframe, isDemoMode) {
    const ctx = document.getElementById('waterUsageChart');
    if (!ctx) return;

    if (this.waterUsageChart) {
      this.waterUsageChart.destroy();
    }

    const z1 = land?.zones?.[0]?.waterUsedToday || 180;
    const z2 = land?.zones?.[1]?.waterUsedToday || 140;
    const z3 = land?.zones?.[2]?.waterUsedToday || 100;

    this.waterUsageChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Zone 1 (Upper Slope)', 'Zone 2 (Middle Slope)', 'Zone 3 (Lower Slope)'],
        datasets: [{
          label: 'Water Consumed Today (Liters)',
          data: [z1, z2, z3],
          backgroundColor: [
            'rgba(230, 81, 0, 0.85)',
            'rgba(46, 125, 50, 0.85)',
            'rgba(2, 136, 209, 0.85)'
          ],
          borderColor: ['#e65100', '#2e7d32', '#0288d1'],
          borderWidth: 1.5,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              afterLabel: (context) => {
                const total = z1 + z2 + z3;
                const pct = total > 0 ? Math.round((context.parsed.y / total) * 100) : 0;
                return `Share: ${pct}% of total farm watering`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Volume (Liters)', font: { weight: '600' } },
            grid: { color: 'rgba(0,0,0,0.06)' }
          },
          x: { grid: { display: false } }
        }
      }
    });
  }

  /**
   * Chart 3: Slope Water Conservation Comparison (SmartSlope vs Traditional Slope Flooding)
   */
  renderWaterSavingsChart(land, isDemoMode) {
    const ctx = document.getElementById('waterSavingsChart');
    if (!ctx) return;

    if (this.comparisonChart) {
      this.comparisonChart.destroy();
    }

    const area = land?.area || 1.0;
    const traditionalUsage = Math.round(area * 2100); // 2100L/acre typical flood/hose
    const smartSlopeUsage = land?.waterUsedToday || Math.round(traditionalUsage * 0.58);
    const waterSaved = Math.max(0, traditionalUsage - smartSlopeUsage);

    this.comparisonChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['SmartSlope Water Applied (L)', 'Water Conserved vs Flood Baseline (L)'],
        datasets: [{
          data: [smartSlopeUsage, waterSaved],
          backgroundColor: ['#2e7d32', '#81c784'],
          hoverOffset: 4,
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: '600' } }
          },
          tooltip: {
            callbacks: {
              label: (context) => `${context.label}: ${context.parsed.toLocaleString()} Liters`
            }
          }
        },
        cutout: '68%'
      }
    });
  }

  /**
   * Update Key Agricultural Metrics Summary
   */
  updateKpiMetrics(land) {
    const area = land?.area || 1.0;
    const usedToday = land?.waterUsedToday || 0;
    const savedToday = land?.totalWaterSaved || Math.round(usedToday * 0.41);
    
    // Electricity & Pump Hours Saved (assuming 3HP pump ~2500L/hour, ₹7.5/kWh)
    const hoursSaved = (savedToday / 2500).toFixed(1);
    const rupeesSaved = Math.round(hoursSaved * 2.2 * 7.5);

    const elUsed = document.getElementById('stat-water-used-today');
    const elSaved = document.getElementById('stat-water-saved-today');
    const elPumpingSaved = document.getElementById('stat-pump-saved-today');
    const elRupees = document.getElementById('stat-rupees-saved-today');

    if (elUsed) elUsed.innerText = `${usedToday.toLocaleString()} L`;
    if (elSaved) elSaved.innerText = `${savedToday.toLocaleString()} L`;
    if (elPumpingSaved) elPumpingSaved.innerText = `${hoursSaved} hrs`;
    if (elRupees) elRupees.innerText = `₹${rupeesSaved}`;
  }

  /**
   * Generate realistic continuous moisture history
   */
  generateHistoricalSeries(currentVal, count, trendPerStep, min, max) {
    const series = [];
    let val = currentVal;
    for (let i = 0; i < count; i++) {
      val = Math.max(min, Math.min(max, val + (Math.random() * 3 - 1.5) + trendPerStep));
      series.unshift(Math.round(val));
    }
    // ensure last matches current
    series[series.length - 1] = currentVal;
    return series;
  }

  /**
   * Export all irrigation and telemetry logs to CSV file for download
   */
  exportToCsv(lands, events, isDemo = true) {
    let csv = "Timestamp,Land ID,Land Name,Zone ID,Zone Name,Moisture Before (%),Duration (mins),Water Applied (L),Trigger Reason,Status,Data Mode\n";

    if (events && events.length > 0) {
      events.forEach(ev => {
        const timeStr = new Date(ev.startTime).toLocaleString();
        const mode = isDemo ? "DEMO_SIMULATION" : "HARDWARE_SENSOR";
        csv += `"${timeStr}","${ev.landId}","${ev.landName || 'Arecanut Estate'}","${ev.zoneId}","${ev.zoneName || 'Zone'}","${ev.moistureBefore || 30}",${ev.durationMinutes || 25},${ev.litersUsed || 180},"${ev.triggerReason || 'Auto Drip'}","${ev.status || 'completed'}","${mode}"\n`;
      });
    } else {
      // Create representative sample log entries
      const now = new Date();
      lands.forEach(land => {
        land.zones.forEach((zone, idx) => {
          const t1 = new Date(now.getTime() - (idx + 1) * 3 * 3600 * 1000).toLocaleString();
          csv += `"${t1}","${land.id}","${land.name}","${zone.id}","${zone.name}","${zone.dryThreshold}",30,180,"Slope Threshold Auto-Start","completed","${isDemo ? 'DEMO_DATA' : 'HARDWARE'}"\n`;
        });
      });
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `smartslope_irrigation_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Global instance
window.smartSlopeAnalytics = new SmartSlopeAnalytics();
