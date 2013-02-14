function makeStandings(participants, pairs) {
  return participants.map(function(it) {
    var matches = pairs
      .filter(function(match) { return match.home === it || match.away === it })
      .map(function(match) {
        if (match.home === it)
          return { ownScore: match.homeScore, opponentScore: match.awayScore }
        else
          return { ownScore: match.awayScore, opponentScore: match.homeScore }
      })
    var wins = matches.filter(function(match) { return (match.ownScore > match.opponentScore) }).size()
    var losses = matches.filter(function(match) { return (match.ownScore < match.opponentScore) }).size()
    var ties = matches.filter(function(match) { return (match.ownScore == match.opponentScore) }).size()
    return {
      name: it,
      wins: wins,
      losses: losses,
      ties: ties,
      points: wins * 3 + ties
    }
  }).sortBy(function(it) { return -it.points })
}

$(function() {
  var participants = _(["a", "b", "c", "d", "e"])
  var pairs = participants.map(function(it, i) {
    return participants.filter(function(_, j) { return j < i }).map(function(it2) {
      return { home: it, homeScore: ~~(Math.random()*10)%10, away: it2, awayScore: ~~(Math.random()*10)%10 }
    }).value()
  }).flatten(true)
  var $container = $('<div class="jqgroup"></div>').appendTo('#container')
  var templates = (function() {
    var standingsMarkup = Handlebars.compile(
      '<div class="standings">'
      +'Standings'
      +'<table>'
      +'<tr><th>Name</th><th>W</th><th>L</th><th>T</th><th>P</tr>'
      +'{{#each this}}'
      +'<tr><td>{{name}}</td><td>{{wins}}</td><td>{{losses}}</td><td>{{ties}}</td><td>{{points}}</td></tr>'
      +'{{/each}}'
      +'</table>'
      +'</div>')
    var roundsMarkup = Handlebars.compile(
      '<div class="rounds"></div>')
    var unassignedMarkup = Handlebars.compile(
      '<div class="unassigned"></div>')
    var matchMarkup = Handlebars.compile(
      '<div data-id="{{id}}" class="match" draggable="true">'
      +'<span class="home">{{home}}</span>'
      +'<input class="home" value="{{homeScore}}" />'
      +'<input class="away" value="{{awayScore}}" />'
      +'<span class="away">{{away}}</span>'
      +'</div>')
    var roundMarkup = Handlebars.compile(
      '<div class="round"><header>Round {{this}}</header></div>')
    var id=0
    return {
      standings: function(participants) { return $(standingsMarkup(participants)) },
      rounds: $(roundsMarkup()),
      unassigned: $(unassignedMarkup()),
      match: function(match) {
        match.id = ++id
        var m = $(matchMarkup(match))

        var scoreChanges = m.find('input').asEventStream('change').map(function(ev) { return $(ev.target) })
        var matchProp = Bacon.combineTemplate({
          home: match.home,
          homeScore: scoreChanges.filter(function(it) { return it.hasClass('home') })
            .map(function(it) { return it.val() })
            .toProperty(match.homeScore),
          away: match.away,
          awayScore: scoreChanges.filter(function(it) { return it.hasClass('away') })
            .map(function(it) { return it.val() })
            .toProperty(match.awayScore)
        })

        m.asEventStream('dragstart').map(function(ev) { return ev.originalEvent }).onValue(function(ev) {
          ev.dataTransfer.setData('Text', match.id)
          m.css('opacity', 0.5)
          $('.round').addClass('droppable')
        })
        m.asEventStream('dragend').map(function(ev) { return ev.originalEvent }).onValue(function(ev) {
          m.css('opacity', 1.0)
          $('.round').removeClass('droppable')
        })
        return { template: m, property: matchProp }
      },
      round: function(round) {
        var r = $(roundMarkup(round))
        r.asEventStream('dragover').map(function(ev) { ev.preventDefault(); return ev }).onValue(function(ev) { })
        r.asEventStream('dragenter').map(function(ev) { ev.preventDefault(); return ev }).onValue(function(ev) {
          r.addClass('over')
        })
        r.asEventStream('dragleave').map(function(ev) { ev.preventDefault(); return ev }).onValue(function(ev) {
          r.removeClass('over')
        })
        r.asEventStream('drop').map(function(ev) { ev.preventDefault(); return ev }).onValue(function(ev) {
          var id = ev.originalEvent.dataTransfer.getData('Text')
          var obj = $('[data-id="'+id+'"]')
          $(ev.target).append(obj)
          r.removeClass('over')
        })
        return r
      }
    }
  })()
  $('<div class="standings"></div>').appendTo($container)
  var rounds = templates.rounds.appendTo($container)
  _([1, 2, 3, 4]).each(function(it) {
    rounds.append(templates.round(it))
  })
  var unassigned = templates.unassigned.appendTo($container)
  var properties = []
  pairs.each(function(it) {
    var match = templates.match(it)
    properties.push(match.property)
    unassigned.append(match.template)
  })
  var state = Bacon.combineAsArray(properties)
  state.onValue(function(val) {
    var standings = makeStandings(participants, _(val))
    $('.standings').replaceWith(templates.standings(standings.value()))
  })
})
