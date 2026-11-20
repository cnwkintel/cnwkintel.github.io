(() => {
  const chartTitles = {
    chartCohorts: "Players by generation", chartFoot: "League experience",
    chartLeague: "League distribution", chartPos: "Position distribution",
    chartPosGood: "Position strength", chartNt: "National-team coverage",
    chartGs: "Generation Standing", chartEurope: "Europe readiness and potential",
    chartPot: "Scouted potential", chartTop: "Top players by minutes",
    chartPosTime: "Career minutes by position", chartRating: "FotMob ratings",
    chartScatter: "Minutes and ratings",
  };
  const strong = new Set(["Leader", "Leading", "Mid"]);
  const direct = new Set(["chartTop", "chartRating", "chartScatter"]);
  let dialog;
  const isUnassessed = name => name === "(blank)" || name === "N/A";
  const fullValue = name => isUnassessed(name) ? "Not assessed" : name;

  function roster(groups, data) {
    if (!data.cohorts) return (data.players_detail || []).map(player => ({player, label: null}));
    return (groups || []).flatMap(group => group.players.map(player => ({
      player, label: group.label, young: group.key === "young",
    })));
  }

  function chartSelection(id, point, people) {
    const {name, seriesIndex, seriesName, data} = point;
    const individual = direct.has(id) || id.startsWith("fm-");
    if (individual) {
      const identity = data?.name || name;
      const person = people.find(row =>
        (row.label ? row.player.name + " · " + row.label : row.player.name) === identity);
      return person ? {title: identity, entries: [person], individual: true} : null;
    }

    const tier = name === "CSL" ? "cs" : "c1";
    const adult = people.filter(row => !row.young);
    const result = {
      chartCohorts: () => people.filter(row => row.label === name),
      chartFoot: () => adult.filter(({player}) => player[tier + (seriesIndex === 0 ? "_ever" : "_foot")]),
      chartLeague: () => adult.filter(({player}) => player.league === name),
      chartPos: () => people.filter(({player}) => player.pos === name || (!player.pos && name === "Unspecified") ||
        (name.endsWith(" (n/a)") && player.pos === name.slice(0, -6))),
      chartPosGood: () => adult.filter(({player}) => player.major === name && strong.has(player.gs) === (seriesIndex === 0)),
      chartNt: () => adult.filter(({player}) => ["Appeared", "Selected"].includes(player.nt?.[name === "SENIOR" ? "Senior" : name])),
      chartGs: () => adult.filter(({player}) => (player.gs || "(blank)") === name),
      chartEurope: () => adult.filter(({player}) => ((seriesIndex === 0 ? player.er : player.ep) || "(blank)") === name),
      chartPot: () => adult.filter(({player}) => (player.pot || "N/A") === name),
      chartPosTime: () => adult.filter(({player}) => player.major === name && player[seriesName === "CSL" ? "cs_mins" : "c1_mins"] > 0),
    }[id];
    if (!result) return null;
    const metric = id === "chartFoot" ? (seriesIndex === 0 ? "Career appearances" : "Regulars") :
      (["chartPosGood", "chartEurope", "chartPosTime"].includes(id) ? seriesName : "");
    return {
      title: [fullValue(name), metric].filter(Boolean).join(" · "),
      entries: result(),
      minuteField: id === "chartPosTime" ? (seriesName === "CSL" ? "cs_mins" : "c1_mins") : null,
    };
  }

  function element(tag, cls, text) {
    const node = document.createElement(tag);
    node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function ensureDialog() {
    if (dialog) return dialog;
    dialog = element("dialog", "chart-player-dialog");
    dialog.setAttribute("aria-labelledby", "chart-player-title");
    document.body.append(dialog);
    return dialog;
  }

  function inspect(title, selections, openProfile) {
    const modal = ensureDialog();
    modal.replaceChildren();
    const head = element("header", "chart-player-header");
    const heading = element("h2", "", title);
    heading.id = "chart-player-title";
    const close = element("button", "chart-player-close", "Close");
    close.type = "button";
    close.addEventListener("click", () => modal.close());
    head.append(heading, close);
    modal.append(head);

    const list = element("ul", "chart-player-list");
    const count = element("p", "chart-player-count");
    function render(selection) {
      const entries = [...selection.entries].sort((a, b) => selection.minuteField ?
        b.player[selection.minuteField] - a.player[selection.minuteField] :
        a.player.name.localeCompare(b.player.name));
      count.textContent = entries.length + (entries.length === 1 ? " player" : " players");
      list.replaceChildren(...entries.map(({player, label}) => {
        const item = element("li", "");
        const button = element("button", "chart-player-row");
        button.type = "button";
        const detail = [label, player.pos, player.club,
          selection.minuteField && player[selection.minuteField].toLocaleString() + " min"].filter(Boolean);
        button.append(element("strong", "", player.name), element("span", "", detail.join(" · ")));
        button.addEventListener("click", () => {
          modal.close();
          openProfile(player.name, label);
        });
        item.append(button);
        return item;
      }));
    }
    if (selections.length > 1) {
      const label = element("label", "chart-player-category", "Data point");
      const select = element("select", "");
      for (const [index, row] of selections.entries()) select.add(new Option(row.title, index));
      label.append(select);
      select.addEventListener("change", () => render(selections[Number(select.value)]));
      modal.append(label);
    }
    modal.append(count, list);
    render(selections[0]);
    modal.showModal();
    modal.scrollTop = 0;
    close.focus();
  }

  function bind(id, chart, option, data, openProfile) {
    const title = chartTitles[id] || (id.startsWith("fm-") ? id.slice(3) + " ranking" : null);
    if (!title) return;
    const people = roster(window.playerDirectoryData, data);
    const series = option.series || [];
    const labels = option.xAxis?.data ?? option.yAxis?.data ?? [];
    const points = series.flatMap((row, seriesIndex) => (row.data || []).map((item, index) => ({
      name: item?.name || labels[index], data: item, seriesIndex, seriesName: row.name,
    })));
    if (id === "chartEurope") points.sort((a,b) => Number(isUnassessed(a.name)) - Number(isUnassessed(b.name)));
    const possible = points.map(point => chartSelection(id, point, people)).filter(selection => selection?.entries.length);
    if (!possible.length) return;

    chart.on("click", "series", point => {
      const selection = chartSelection(id, point, people);
      if (!selection?.entries.length) return;
      if (selection.individual) {
        const {player, label} = selection.entries[0];
        openProfile(player.name, label);
      } else {
        inspect(title + " · " + selection.title, [selection], openProfile);
      }
    });
    const controls = chart.getDom().parentElement.querySelector(".cbar");
    if (controls) {
      const button = element("button", "btn chart-players", "Players");
      button.type = "button";
      button.setAttribute("aria-label", "View players for " + title);
      button.addEventListener("click", () => inspect(title, possible, openProfile));
      const exportButton = controls.querySelector("[data-chart]");
      if (exportButton) {
        const actions = element("div", "chart-actions");
        exportButton.replaceWith(actions);
        actions.append(button, exportButton);
      } else {
        controls.append(button);
      }
    }
  }

  window.bindReportChart = bind;
})();

