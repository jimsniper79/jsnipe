import EventEmitter from 'eventemitter3';

export type Events = {
  'mint:new': { mint: string; source: string };
};

const bus = new EventEmitter<Events>();
export default bus;
