// A hand-written OGraf v1 Graphic that is deliberately NOT a NoaCG template: no SPX definition,
// no fN ids, no NOACG_ANIM - semantic data keys, two custom actions, two steps, plain DOM and CSS
// transitions. The e2e acceptance fixture for "NoaCG derives an operator surface from a Graphic
// it has never seen, and drives it, without any category-specific code" (docs/AGENT_CLI.md).
// Kept free of GSAP so it has no package resources to resolve - what a stranger's package may be.

const STYLE = `
  .bug { position: absolute; left: 120px; top: 80px; display: flex; align-items: center; gap: 16px;
         padding: 12px 20px; background: #101418; color: #fff; font: 700 40px/1 system-ui, sans-serif;
         border-radius: 8px; opacity: 0; transition: opacity .3s; }
  .bug.on { opacity: 1; }
  .bug .goals { font-variant-numeric: tabular-nums; color: #ffd166; }
  .bug .comp { display: none; font-size: 22px; color: #9aa4b2; margin-left: 12px; }
  .bug.step-1 .comp { display: inline; }
  .bug.flash-home .home, .bug.flash-away .away { color: #06d6a0; }
`;

export default class DemoScorebug extends HTMLElement {
  constructor() {
    super();
    this._data = { homeTeam: 'HOME', awayTeam: 'AWAY', homeGoals: 0, awayGoals: 0, competition: 'Cup final' };
    this._step = -1;
    this._root = null;
  }

  _render() {
    if (!this._root) return;
    const d = this._data;
    this._root.querySelector('[data-key="homeTeam"]').textContent = String(d.homeTeam);
    this._root.querySelector('[data-key="awayTeam"]').textContent = String(d.awayTeam);
    this._root.querySelector('[data-key="homeGoals"]').textContent = String(d.homeGoals);
    this._root.querySelector('[data-key="awayGoals"]').textContent = String(d.awayGoals);
    this._root.querySelector('[data-key="competition"]').textContent = String(d.competition);
  }

  async load(params) {
    Object.assign(this._data, (params && params.data) || {});
    const style = document.createElement('style');
    style.textContent = STYLE;
    this.appendChild(style);
    const root = document.createElement('div');
    root.className = 'bug';
    root.innerHTML =
      '<span class="home" data-key="homeTeam"></span>' +
      '<span class="goals"><span data-key="homeGoals"></span> - <span data-key="awayGoals"></span></span>' +
      '<span class="away" data-key="awayTeam"></span>' +
      '<span class="comp" data-key="competition"></span>';
    this.appendChild(root);
    this._root = root;
    this._render();
    return { statusCode: 200 };
  }

  async dispose() {
    this.innerHTML = '';
    this._root = null;
    this._step = -1;
    return { statusCode: 200 };
  }

  async playAction(params) {
    if (!this._root) return { statusCode: 409, statusMessage: 'not loaded' };
    const target = params && params.goto != null && params.goto >= 0 ? params.goto : this._step + (params && params.delta != null ? params.delta : 1);
    if (target >= 2) {
      this._root.classList.remove('on', 'step-1');
      this._step = -1;
      return { statusCode: 200, currentStep: undefined };
    }
    this._step = Math.max(0, target);
    this._root.classList.add('on');
    this._root.classList.toggle('step-1', this._step === 1);
    return { statusCode: 200, currentStep: this._step };
  }

  async stopAction() {
    if (!this._root) return { statusCode: 409, statusMessage: 'not loaded' };
    this._root.classList.remove('on', 'step-1');
    this._step = -1;
    return { statusCode: 200 };
  }

  async updateAction(params) {
    if (!this._root) return { statusCode: 409, statusMessage: 'not loaded' };
    Object.assign(this._data, (params && params.data) || {});
    this._render();
    return { statusCode: 200 };
  }

  async customAction(params) {
    if (!this._root) return { statusCode: 409, statusMessage: 'not loaded' };
    const id = params && params.id;
    if (id === 'goal') {
      const side = params.payload && params.payload.side === 'away' ? 'away' : 'home';
      this._data[side === 'home' ? 'homeGoals' : 'awayGoals'] += 1;
      this._root.classList.add(`flash-${side}`);
      setTimeout(() => this._root && this._root.classList.remove(`flash-${side}`), 600);
      this._render();
      return { statusCode: 200 };
    }
    if (id === 'reset') {
      this._data.homeGoals = 0;
      this._data.awayGoals = 0;
      this._render();
      return { statusCode: 200 };
    }
    return { statusCode: 400, statusMessage: `no such action "${id}"` };
  }
}
