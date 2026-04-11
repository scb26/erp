window.LedgerFlow = window.LedgerFlow || {};

(function (ns) {
  var utils = ns.utils;
  var SERIES_META = {
    sales: { label: "Sale", className: "sales" },
    expense: { label: "Expense", className: "expense" },
    net: { label: "Net", className: "net" }
  };

  ns.modules = ns.modules || {};

  function init(app) {
    if (!app.dashboardChartRange) {
      app.dashboardChartRange = "month";
    }

    if (!app.dashboardChartSeries) {
      app.dashboardChartSeries = "sales";
    }

    if (app.elements.dashboardChartRangeSelect) {
      app.elements.dashboardChartRangeSelect.value = app.dashboardChartRange;
      app.elements.dashboardChartRangeSelect.addEventListener("change", function () {
        app.dashboardChartRange = app.elements.dashboardChartRangeSelect.value || "month";
        render(app);
      });
    }

    if (app.elements.dashboardSeriesToggle) {
      app.elements.dashboardSeriesToggle.addEventListener("click", function (event) {
        var button = event.target.closest("[data-series]");

        if (!button) {
          return;
        }

        app.dashboardChartSeries = SERIES_META[button.dataset.series] ? button.dataset.series : "sales";
        render(app);
      });
    }

    if (app.elements.dashboardChart) {
      app.elements.dashboardChart.addEventListener("pointermove", function (event) {
        handleChartPointerMove(app, event);
      });

      app.elements.dashboardChart.addEventListener("pointerleave", function () {
        hideTooltip(app);
      });
    }
  }

  // Dashboard behaves like a widget surface so we can keep adding focused cards over time.
  function render(app) {
    var metrics = buildTodayMetrics(app);

    renderMetricWidgets(app, metrics);
    syncSeriesButtons(app);
    renderTrendChart(app);
  }

  function renderMetricWidgets(app, metrics) {
    if (!app.elements.dashboardTodaySales || !app.elements.dashboardTodayExpense || !app.elements.dashboardTodayNet) {
      return;
    }

    app.elements.dashboardTodaySales.textContent = utils.formatCurrency(metrics.sales);
    app.elements.dashboardTodayExpense.textContent = utils.formatCurrency(metrics.expense);
    app.elements.dashboardTodayNet.textContent = utils.formatCurrency(metrics.net);
  }

  function syncSeriesButtons(app) {
    if (!app.elements.dashboardSeriesButtons || !app.elements.dashboardSeriesButtons.length) {
      return;
    }

    app.elements.dashboardSeriesButtons.forEach(function (button) {
      var isActive = button.dataset.series === app.dashboardChartSeries;

      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function renderTrendChart(app) {
    var rangeKey = app.dashboardChartRange || "month";
    var seriesKey = SERIES_META[app.dashboardChartSeries] ? app.dashboardChartSeries : "sales";
    var chartModel;

    if (!app.elements.dashboardChart) {
      return;
    }

    if (app.elements.dashboardChartRangeSelect && app.elements.dashboardChartRangeSelect.value !== rangeKey) {
      app.elements.dashboardChartRangeSelect.value = rangeKey;
    }

    chartModel = buildTrendModel(app, rangeKey, seriesKey);
    app.elements.dashboardChart.innerHTML = buildChartMarkup(chartModel);
  }

  // Today's widgets stay fixed on today's business movement, regardless of the chart range.
  function buildTodayMetrics(app) {
    var todayKey = utils.today();
    var invoices = Array.isArray(app.data.invoices) ? app.data.invoices : [];
    var expenses = Array.isArray(app.data.expenses) ? app.data.expenses : [];
    var sales = 0;
    var expense = 0;

    invoices.forEach(function (invoice) {
      var invoiceDate = String(invoice.invoiceDate || "").slice(0, 10);
      var invoiceTotal = parseFloat(invoice.totals && invoice.totals.grandTotal) || 0;

      if (invoiceDate === todayKey) {
        sales += invoiceTotal;
      }
    });

    expenses.forEach(function (entry) {
      if (resolveEntryDate(entry) === todayKey) {
        expense += parseFloat(entry.amount) || 0;
      }
    });

    sales = utils.round(sales);
    expense = utils.round(expense);

    return {
      sales: sales,
      expense: expense,
      net: utils.round(sales - expense)
    };
  }

  function buildTrendModel(app, rangeKey, seriesKey) {
    var buckets = buildBuckets(rangeKey);
    var invoices = Array.isArray(app.data.invoices) ? app.data.invoices : [];
    var expenses = Array.isArray(app.data.expenses) ? app.data.expenses : [];
    var values;
    var meta = SERIES_META[seriesKey] || SERIES_META.sales;
    var minValue;
    var maxValue;

    buckets.forEach(function (bucket) {
      bucket.sales = sumInvoicesForDate(invoices, bucket.key);
      bucket.expense = sumExpensesForDate(expenses, bucket.key);
      bucket.net = utils.round(bucket.sales - bucket.expense);
    });

    values = buckets.map(function (bucket) {
      return bucket[seriesKey];
    });
    minValue = Math.min.apply(null, [0].concat(values));
    maxValue = Math.max.apply(null, [0].concat(values));

    return {
      rangeKey: rangeKey,
      rangeLabel: rangeKey === "today" ? "Today" : (rangeKey === "week" ? "This Week" : "This Month"),
      seriesKey: seriesKey,
      seriesLabel: meta.label,
      seriesClassName: meta.className,
      buckets: buckets,
      minValue: minValue,
      maxValue: maxValue,
      valueRange: Math.max(maxValue - minValue, 1)
    };
  }

  function buildBuckets(rangeKey) {
    var count = rangeKey === "today" ? 1 : (rangeKey === "week" ? 7 : 30);
    var buckets = [];
    var offset;

    for (offset = count - 1; offset >= 0; offset -= 1) {
      buckets.push(createBucket(daysAgoDate(offset), rangeKey));
    }

    return buckets;
  }

  function createBucket(date, rangeKey) {
    var key = formatDateKey(date);
    var dayNumber = date.getDate();

    return {
      key: key,
      label: rangeKey === "today"
        ? "Today"
        : (rangeKey === "week" ? weekdayLabel(date) : dayNumber + " " + monthLabel(date))
    };
  }

  function buildChartMarkup(model) {
    var width = 920;
    var height = 360;
    var margin = { top: 24, right: 28, bottom: 52, left: 70 };
    var plotWidth = width - margin.left - margin.right;
    var plotHeight = height - margin.top - margin.bottom;
    var baselineY = pointY(0, model.minValue, model.maxValue, model.valueRange, plotHeight, margin.top);
    var labelStep = model.rangeKey === "month" ? 4 : 1;
    var points = buildSeriesPoints(model.buckets, model.seriesKey, model.minValue, model.maxValue, model.valueRange, plotWidth, plotHeight, margin);
    var xLabels = model.buckets.map(function (bucket, index) {
      var x = pointX(index, model.buckets.length, plotWidth, margin.left);
      var shouldShow = model.rangeKey !== "month" || index % labelStep === 0 || index === model.buckets.length - 1;

      if (!shouldShow) {
        return "";
      }

      return '<text class="dashboard-chart__axis-label" x="' + x + '" y="' + (height - 18) + '" text-anchor="middle">' + utils.escapeHtml(bucket.label) + '</text>';
    }).join("");

    return [
      '<div class="dashboard-chart__caption">Showing ' + utils.escapeHtml(model.rangeLabel) + ' ' + utils.escapeHtml(model.seriesLabel.toLowerCase()) + ' trend from saved records.</div>',
      '<div class="dashboard-chart__surface">',
      '<svg class="dashboard-chart__svg" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="' + utils.escapeHtml(model.seriesLabel) + ' trend chart">',
      buildGridLines(model, plotWidth, plotHeight, margin),
      '<path class="dashboard-chart__area dashboard-chart__area--' + model.seriesClassName + '" d="' + buildAreaPath(points, baselineY) + '"></path>',
      '<path class="dashboard-chart__line dashboard-chart__line--' + model.seriesClassName + '" d="' + buildSmoothPath(points) + '"></path>',
      renderDots(points, model.seriesClassName),
      renderHitTargets(points, model.seriesLabel),
      xLabels,
      '</svg>',
      '<div class="dashboard-chart__tooltip" hidden></div>',
      '</div>'
    ].join("");
  }

  function buildGridLines(model, plotWidth, plotHeight, margin) {
    var steps = 4;
    var parts = [];
    var index;

    for (index = 0; index <= steps; index += 1) {
      var ratio = index / steps;
      var value = model.minValue + (model.valueRange * ratio);
      var y = pointY(value, model.minValue, model.maxValue, model.valueRange, plotHeight, margin.top);

      parts.push('<line class="dashboard-chart__grid-line" x1="' + margin.left + '" y1="' + y + '" x2="' + (margin.left + plotWidth) + '" y2="' + y + '"></line>');
      parts.push('<text class="dashboard-chart__axis-label" x="' + (margin.left - 12) + '" y="' + (y + 4) + '" text-anchor="end">' + utils.escapeHtml(formatAxisValue(value)) + '</text>');
    }

    parts.push('<line class="dashboard-chart__axis" x1="' + margin.left + '" y1="' + pointY(0, model.minValue, model.maxValue, model.valueRange, plotHeight, margin.top) + '" x2="' + (margin.left + plotWidth) + '" y2="' + pointY(0, model.minValue, model.maxValue, model.valueRange, plotHeight, margin.top) + '"></line>');

    return parts.join("");
  }

  function buildSeriesPoints(buckets, key, minValue, maxValue, valueRange, plotWidth, plotHeight, margin) {
    return buckets.map(function (bucket, index) {
      return {
        x: pointX(index, buckets.length, plotWidth, margin.left),
        y: pointY(bucket[key], minValue, maxValue, valueRange, plotHeight, margin.top),
        value: bucket[key],
        label: bucket.label
      };
    });
  }

  function buildSmoothPath(points) {
    if (!points.length) {
      return "";
    }

    if (points.length === 1) {
      return "M" + points[0].x + " " + points[0].y + " L" + points[0].x + " " + points[0].y;
    }

    return points.reduce(function (path, point, index, source) {
      var cps;
      var cpe;

      if (index === 0) {
        return "M" + point.x + " " + point.y;
      }

      cps = controlPoint(source[index - 1], source[index - 2], point, false);
      cpe = controlPoint(point, source[index - 1], source[index + 1], true);
      return path + " C" + cps.x + " " + cps.y + ", " + cpe.x + " " + cpe.y + ", " + point.x + " " + point.y;
    }, "");
  }

  function buildAreaPath(points, baselineY) {
    if (!points.length) {
      return "";
    }

    return buildSmoothPath(points) + " L" + points[points.length - 1].x + " " + baselineY + " L" + points[0].x + " " + baselineY + " Z";
  }

  function controlPoint(current, previous, next, reverse) {
    var p = previous || current;
    var n = next || current;
    var line = lineProperties(p, n);
    var smoothing = 0.16;
    var angle = line.angle + (reverse ? Math.PI : 0);
    var length = line.length * smoothing;

    return {
      x: current.x + Math.cos(angle) * length,
      y: current.y + Math.sin(angle) * length
    };
  }

  function lineProperties(pointA, pointB) {
    var lengthX = pointB.x - pointA.x;
    var lengthY = pointB.y - pointA.y;

    return {
      length: Math.sqrt((lengthX * lengthX) + (lengthY * lengthY)),
      angle: Math.atan2(lengthY, lengthX)
    };
  }

  function renderDots(points, className) {
    return points.map(function (point) {
      return '<circle class="dashboard-chart__dot dashboard-chart__dot--' + className + '" cx="' + point.x + '" cy="' + point.y + '" r="4.5"></circle>';
    }).join("");
  }

  function renderHitTargets(points, seriesLabel) {
    return points.map(function (point) {
      return '<circle class="dashboard-chart__hit" cx="' + point.x + '" cy="' + point.y + '" r="14" data-series-label="' + utils.escapeHtml(seriesLabel) + '" data-point-label="' + utils.escapeHtml(point.label) + '" data-point-value="' + utils.escapeHtml(utils.formatCurrency(point.value)) + '"></circle>';
    }).join("");
  }

  function handleChartPointerMove(app, event) {
    var target = event.target.closest(".dashboard-chart__hit");

    if (!target || !app.elements.dashboardChart.contains(target)) {
      hideTooltip(app);
      return;
    }

    showTooltip(app, target, event);
  }

  function showTooltip(app, target, event) {
    var tooltip = app.elements.dashboardChart.querySelector(".dashboard-chart__tooltip");
    var rect;
    var left;
    var top;

    if (!tooltip) {
      return;
    }

    tooltip.hidden = false;
    tooltip.innerHTML = [
      '<strong>' + utils.escapeHtml(target.dataset.seriesLabel || "") + '</strong>',
      '<span>' + utils.escapeHtml(target.dataset.pointLabel || "") + '</span>',
      '<span>' + utils.escapeHtml(target.dataset.pointValue || "") + '</span>'
    ].join("");

    rect = app.elements.dashboardChart.getBoundingClientRect();
    left = Math.max(82, Math.min(rect.width - 82, event.clientX - rect.left));
    top = Math.max(22, event.clientY - rect.top - 18);
    tooltip.style.left = left + "px";
    tooltip.style.top = top + "px";
  }

  function hideTooltip(app) {
    var tooltip = app.elements.dashboardChart && app.elements.dashboardChart.querySelector(".dashboard-chart__tooltip");

    if (!tooltip) {
      return;
    }

    tooltip.hidden = true;
  }

  function pointX(index, total, plotWidth, leftMargin) {
    if (total <= 1) {
      return leftMargin + (plotWidth / 2);
    }

    return leftMargin + ((plotWidth / (total - 1)) * index);
  }

  function pointY(value, minValue, maxValue, valueRange, plotHeight, topMargin) {
    return topMargin + plotHeight - (((value - minValue) / (valueRange || Math.max(maxValue - minValue, 1))) * plotHeight);
  }

  function sumInvoicesForDate(invoices, targetDate) {
    return utils.round(invoices.reduce(function (total, invoice) {
      if (String(invoice.invoiceDate || "").slice(0, 10) !== targetDate) {
        return total;
      }

      return total + (parseFloat(invoice.totals && invoice.totals.grandTotal) || 0);
    }, 0));
  }

  function sumExpensesForDate(expenses, targetDate) {
    return utils.round(expenses.reduce(function (total, entry) {
      if (resolveEntryDate(entry) !== targetDate) {
        return total;
      }

      return total + (parseFloat(entry.amount) || 0);
    }, 0));
  }

  function resolveEntryDate(entry) {
    return String(
      entry.date ||
      entry.expenseDate ||
      entry.createdAt ||
      entry.created_at ||
      ""
    ).slice(0, 10);
  }

  function formatAxisValue(value) {
    var absoluteValue = Math.abs(value);
    var prefix = value < 0 ? "-₹" : "₹";

    if (absoluteValue >= 100000) {
      return prefix + utils.round(absoluteValue / 100000) + "L";
    }

    if (absoluteValue >= 1000) {
      return prefix + utils.round(absoluteValue / 1000) + "k";
    }

    return prefix + Math.round(absoluteValue);
  }

  function daysAgoDate(daysAgo) {
    var date = new Date();

    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - daysAgo);
    return date;
  }

  function formatDateKey(date) {
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");

    return year + "-" + month + "-" + day;
  }

  function weekdayLabel(date) {
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
  }

  function monthLabel(date) {
    return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][date.getMonth()];
  }

  ns.modules.dashboard = {
    init: init,
    render: render
  };
})(window.LedgerFlow);
