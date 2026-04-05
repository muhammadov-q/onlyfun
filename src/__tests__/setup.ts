import { vi } from "vitest";
import "@testing-library/jest-dom/vitest";

// ─── WebRTC Mocks ────────────────────────────────────────────────────────────

class MockRTCSessionDescription {
  type: string;
  sdp: string;
  constructor(init: { type: string; sdp?: string }) {
    this.type = init.type;
    this.sdp = init.sdp ?? "";
  }
  toJSON() {
    return { type: this.type, sdp: this.sdp };
  }
}

class MockRTCIceCandidate {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
  constructor(init: { candidate?: string; sdpMid?: string; sdpMLineIndex?: number }) {
    this.candidate = init.candidate ?? "";
    this.sdpMid = init.sdpMid ?? null;
    this.sdpMLineIndex = init.sdpMLineIndex ?? null;
  }
  toJSON() {
    return { candidate: this.candidate, sdpMid: this.sdpMid, sdpMLineIndex: this.sdpMLineIndex };
  }
}

class MockMediaStream {
  id = "mock-stream-id";
  private _tracks: MockMediaStreamTrack[] = [];

  constructor(tracks?: MockMediaStreamTrack[]) {
    this._tracks = tracks ?? [new MockMediaStreamTrack()];
  }

  getTracks() {
    return [...this._tracks];
  }
  getAudioTracks() {
    return this._tracks.filter((t) => t.kind === "audio");
  }
  addTrack(track: MockMediaStreamTrack) {
    this._tracks.push(track);
  }
}

class MockMediaStreamTrack {
  kind = "audio";
  enabled = true;
  id = "mock-track-" + Math.random().toString(36).slice(2);
  readyState: "live" | "ended" = "live";

  stop() {
    this.readyState = "ended";
  }
  clone() {
    const t = new MockMediaStreamTrack();
    t.kind = this.kind;
    t.enabled = this.enabled;
    return t;
  }
}

class MockRTCRtpSender {
  track: MockMediaStreamTrack | null;
  constructor(track: MockMediaStreamTrack | null) {
    this.track = track;
  }
  async replaceTrack(track: MockMediaStreamTrack | null) {
    this.track = track;
  }
}

class MockRTCPeerConnection {
  localDescription: MockRTCSessionDescription | null = null;
  remoteDescription: MockRTCSessionDescription | null = null;
  iceConnectionState: RTCIceConnectionState = "new";
  connectionState: RTCPeerConnectionState = "new";
  signalingState: RTCSignalingState = "stable";

  onicecandidate: ((e: { candidate: MockRTCIceCandidate | null }) => void) | null = null;
  ontrack: ((e: { streams: MockMediaStream[] }) => void) | null = null;
  oniceconnectionstatechange: (() => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;

  private _senders: MockRTCRtpSender[] = [];
  private _closed = false;

  addTrack(track: MockMediaStreamTrack, stream: MockMediaStream) {
    const sender = new MockRTCRtpSender(track);
    this._senders.push(sender);
    return sender;
  }

  addTransceiver(trackOrKind: string, init?: { direction: string }) {
    return { sender: new MockRTCRtpSender(null), receiver: {}, direction: init?.direction };
  }

  getSenders() {
    return [...this._senders];
  }

  async createOffer() {
    return { type: "offer", sdp: "mock-offer-sdp" };
  }

  async createAnswer() {
    return { type: "answer", sdp: "mock-answer-sdp" };
  }

  async setLocalDescription(desc: { type: string; sdp: string }) {
    this.localDescription = new MockRTCSessionDescription(desc);
  }

  async setRemoteDescription(desc: MockRTCSessionDescription) {
    this.remoteDescription = desc;
  }

  async addIceCandidate(candidate: MockRTCIceCandidate) {
    // noop
  }

  close() {
    this._closed = true;
    this.iceConnectionState = "closed";
    this.connectionState = "closed";
  }

  get closed() {
    return this._closed;
  }

  // Test helpers
  _simulateIceState(state: RTCIceConnectionState) {
    this.iceConnectionState = state;
    this.oniceconnectionstatechange?.();
  }

  _simulateTrack(stream?: MockMediaStream) {
    const s = stream ?? new MockMediaStream();
    this.ontrack?.({ streams: [s] });
  }

  _simulateIceCandidate(candidate?: MockRTCIceCandidate) {
    this.onicecandidate?.({
      candidate: candidate ?? new MockRTCIceCandidate({ candidate: "mock-candidate" }),
    });
  }
}

// ─── AudioContext Mock ────────────────────────────────────────────────────────

class MockAnalyserNode {
  fftSize = 256;
  frequencyBinCount = 128;
  getByteFrequencyData(arr: Uint8Array) {
    arr.fill(0);
  }
}

class MockAudioContext {
  state = "running";
  async resume() {}
  createAnalyser() {
    return new MockAnalyserNode();
  }
  createMediaStreamSource() {
    return { connect: () => {} };
  }
  async close() {}
}

// ─── Navigator Mock ──────────────────────────────────────────────────────────

const mockGetUserMedia = vi.fn().mockResolvedValue(new MockMediaStream());
const mockEnumerateDevices = vi
  .fn()
  .mockResolvedValue([{ kind: "audioinput", deviceId: "default", label: "Default Microphone" }]);

// ─── Assign globals ──────────────────────────────────────────────────────────

Object.assign(globalThis, {
  RTCPeerConnection: MockRTCPeerConnection,
  RTCSessionDescription: MockRTCSessionDescription,
  RTCIceCandidate: MockRTCIceCandidate,
  MediaStream: MockMediaStream,
  AudioContext: MockAudioContext,
  requestAnimationFrame: (cb: () => void) => setTimeout(cb, 16),
  cancelAnimationFrame: (id: number) => clearTimeout(id),
});

Object.defineProperty(globalThis.navigator, "mediaDevices", {
  value: {
    getUserMedia: mockGetUserMedia,
    enumerateDevices: mockEnumerateDevices,
  },
  writable: true,
});

export {
  MockRTCPeerConnection,
  MockRTCSessionDescription,
  MockRTCIceCandidate,
  MockMediaStream,
  MockMediaStreamTrack,
  MockRTCRtpSender,
  MockAudioContext,
  MockAnalyserNode,
  mockGetUserMedia,
  mockEnumerateDevices,
};
