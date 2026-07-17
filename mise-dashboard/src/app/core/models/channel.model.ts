export interface Channel {
  id: number;
  name: string;
  position: number;
}

export type ChannelPayload = Omit<Channel, 'id' | 'position'>;
