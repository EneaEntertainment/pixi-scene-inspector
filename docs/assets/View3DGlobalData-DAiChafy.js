import { bm as DataStoreBuffer, J as BufferResource, bn as BUFFER_CALL_BYTES, R as RendererType, bo as alignToDataTextureRows, T as Texture, bp as createDataTextureSource, K as Buffer3D, e as BufferUsage, bq as uploadFloatRange, br as BUFFER_SPAN_FLOOR_BYTES, w as warn, bs as dataTextureSize, aE as BufferImageSource, i as isMobile, bt as isSafari, bu as Box, aJ as Matrix4, aI as UniformGroup, W as MAX_SHADOW_SLOTS, N as BindGroup, bv as iblSamplingFuncsBit, aB as fullscreenTriangleGeometry, a as State, bw as toneOutputBits, aK as CLEAR, aA as Rectangle, bx as RenderPass, by as createShadowRenderTarget, Q as DEPTH_EMPTY, bz as CameraData, bA as Vector3, bB as SHADOW_QUALITY_SIZE, bC as cascadeRenderSkip, bD as updateRateFor, bE as updateSpotShadowMatrices, bF as warnOnce, ay as cascadeCountFor, bG as Sphere, bH as LIGHT_DEPTH_LANES, bI as LIGHT_TILE_LANES, ap as srgbEncodeBit, at as collectTextureNames, bJ as mergeMaterialStruct, bK as derivativeTangentFrameBit, g as getAttributeInfoFromFormat, a2 as bindingFields, a3 as bindingType, bL as createStructLayout, ba as GCManagedHash, aQ as TexturePool, bM as uid, bN as alignTo4Bytes, bO as Geometry, av as GlobalResourceRegistry, bP as Container3D, bQ as prepareCamera, au as getCameraData } from "./index-DVREQIrz.js";
import { R as RenderTexture, c as clearList } from "./RenderTexture-DsqSJlMc.js";
const copyGeometryData = (geometry, buffer, u32Buffer, _fl64Buffer, offset) => {
  const { center, radius } = geometry.boundsSphere;
  buffer[offset] = center.x;
  buffer[offset + 1] = center.y;
  buffer[offset + 2] = center.z;
  buffer[offset + 3] = geometry.dynamic ? -1 : radius + geometry._morphBoundsExpansion;
  if (geometry.morphTargetCount > 0) {
    const packed = geometry._morphDeltaBase >= 0;
    u32Buffer[offset + 4] = packed ? geometry._morphDeltaBase : 0;
    u32Buffer[offset + 5] = packed ? geometry.morphTargetCount : 0;
    u32Buffer[offset + 6] = packed ? geometry._geometryAtlasAllocation?.baseVertex || 0 : 0;
  }
};
var GeometryDataStoreBuffer = class extends DataStoreBuffer {
  constructor(initialSize = 100) {
    super({
      stride: 8,
      indexKey: "_geometryDataIndex",
      copier: copyGeometryData,
      initialSize
    });
  }
  /**
  * Never adopts another store's row, whose index may name a row here, but frees it there and takes a
  * new one, so two live renderers drawing one geometry swap its row every frame
  */
  set(geometry) {
    const old = geometry._geometryDataStore;
    if (old !== this) {
      old?.remove(geometry);
      geometry._geometryDataStore = this;
    }
    return super.set(geometry);
  }
};
var MaterialRowResource = class extends BufferResource {
  constructor(options) {
    super(options);
    this.buffer.off("change", this.onBufferChange, this);
  }
};
const INITIAL_TEXELS = 1024;
const BYTES_PER_TEXEL = 16;
function leastCommonMultiple(a, b) {
  let x = a;
  let y = b;
  while (y) [x, y] = [y, x % y];
  return a / x * b;
}
var MaterialDataStoreBuffer = class {
  data;
  _retiredTextures = [];
  /** Growth replaces it, so read it each frame rather than holding it */
  texture;
  /** The uniform view, `null` until a {@link uniformResource} call and again after growth retires it */
  _buffer = null;
  _retiredBuffers = [];
  _alignment = 0;
  _texelsPerUnit = 0;
  _end = 0;
  _freePlaces = /* @__PURE__ */ new Map();
  /** Live in the first `_dirtyCount` entries; the drain nulls each, so a queued material can be collected */
  _dirtyQueue = [];
  _dirtyCount = 0;
  _ranges = /* @__PURE__ */ new Uint32Array(64);
  /** Bumped when growth replaces the GPU views, so whatever bound the old ones must bind again */
  bufferVersion = 0;
  /** Per-call fee for uniform writes; `Infinity` on WebGL, where pixi uploads only the last range set before a bind */
  _bufferCallBytes = 0;
  constructor(options) {
    const { alignment, rendererType } = options;
    if (!(alignment > 0)) throw new Error(`MaterialDataStoreBuffer: renderer.limits.minUniformBufferOffsetAlignment is ${alignment}; the limits system fills it in after the renderer has a context`);
    this._alignment = leastCommonMultiple(alignment, BYTES_PER_TEXEL);
    this._texelsPerUnit = this._alignment / BYTES_PER_TEXEL;
    this._bufferCallBytes = rendererType === RendererType.WEBGPU ? BUFFER_CALL_BYTES : Infinity;
    this.data = new Float32Array(alignToDataTextureRows(INITIAL_TEXELS * 4));
    this.texture = new Texture({ source: createDataTextureSource(this.data) });
  }
  /**
  * Does nothing once the store is destroyed, so a late `material.update()` can't leave the material
  * flagged as queued on a store that never drains
  */
  enqueueDirty(material) {
    if (!this.data || material._storeQueued) return;
    material._storeQueued = true;
    this._dirtyQueue[this._dirtyCount++] = material;
  }
  /**
  * Places the material at once, since callers write its index into mesh rows in the same walk;
  * another store's place is handed back, as in `GeometryDataStoreBuffer.set`
  */
  register(material) {
    const old = material._uploadQueue;
    if (old === this && material._materialIndex !== -1) return;
    if (old && old !== this) old.remove(material);
    material._uploadQueue = this;
    material._storeQueued = false;
    this._allocate(material);
    this.enqueueDirty(material);
  }
  /**
  * Reads the material's data for the place's length, so call it before the data is dropped; once the
  * store is destroyed it only resets the index
  */
  remove(material) {
    const index = material._materialIndex;
    if (index < 0) return;
    material._materialIndex = -1;
    if (!this.data) return;
    const units = this._units(material);
    let free = this._freePlaces.get(units);
    if (!free) this._freePlaces.set(units, free = []);
    free.push(index);
  }
  /** Cached on the material, and replaced once growth or a re-registration moves its place */
  uniformResource(material) {
    const buffer = this._buffer ??= new Buffer3D({
      data: this.data,
      usage: BufferUsage.UNIFORM | BufferUsage.COPY_DST,
      label: "MaterialStore"
    });
    const offset = material._materialIndex * BYTES_PER_TEXEL;
    let resource = material._uniformResource;
    if (resource && resource.buffer === buffer && resource.offset === offset) return resource;
    resource?.destroy(false);
    resource = material._uniformResource = new MaterialRowResource({
      buffer,
      offset,
      size: this._units(material) * this._alignment
    });
    return resource;
  }
  /**
  * Resets the count before the drain, so a throw can't leave it counting nulled entries; skips a
  * material whose `_uploadQueue` is no longer this store
  */
  update() {
    const queue = this._dirtyQueue;
    const count = this._dirtyCount;
    if (count === 0) return;
    this._dirtyCount = 0;
    const data = this.data;
    let rangeCount = 0;
    let floats = 0;
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < count; i++) {
      const material = queue[i];
      queue[i] = null;
      if (material._uploadQueue !== this) continue;
      material._storeQueued = false;
      const f32 = material.data._f32;
      const start = material._materialIndex * 4;
      const end = start + f32.length;
      data.set(f32, start);
      if (rangeCount * 2 + 2 > this._ranges.length) {
        const ranges2 = new Uint32Array(this._ranges.length * 2);
        ranges2.set(this._ranges);
        this._ranges = ranges2;
      }
      this._ranges[rangeCount * 2] = start;
      this._ranges[rangeCount * 2 + 1] = end;
      rangeCount++;
      floats += end - start;
      if (start < min) min = start;
      if (end > max) max = end;
    }
    if (rangeCount === 0) return;
    const ranges = this._ranges;
    const spanBytes = (max - min) * 4;
    const rangeBytes = floats * 4;
    const source = this.texture.source;
    if (rangeCount * 16384 + rangeBytes < spanBytes) for (let r = 0; r < rangeCount; r++) uploadFloatRange(source, ranges[r * 2], ranges[r * 2 + 1]);
    else uploadFloatRange(source, min, max);
    const buffer = this._buffer;
    if (!buffer) return;
    if (spanBytes >= BUFFER_SPAN_FLOOR_BYTES && rangeCount * this._bufferCallBytes + rangeBytes < spanBytes) for (let r = 0; r < rangeCount; r++) {
      const start = ranges[r * 2];
      buffer.update((ranges[r * 2 + 1] - start) * 4, start * 4);
    }
    else buffer.update(spanBytes, min * 4);
  }
  destroy() {
    if (!this.data) return;
    this._buffer?.destroy();
    for (let i = 0; i < this._retiredBuffers.length; i++) this._retiredBuffers[i].destroy();
    for (let i = 0; i < this._retiredTextures.length; i++) this._retiredTextures[i].destroy(true);
    this.texture.destroy(true);
    this.data = null;
    this._buffer = null;
    this._retiredBuffers = null;
    this._retiredTextures = null;
    this.texture = null;
    this._freePlaces = null;
    this._dirtyQueue = null;
    this._dirtyCount = 0;
    this._ranges = null;
  }
  _units(material) {
    return Math.ceil(material.data._f32.byteLength / this._alignment);
  }
  _allocate(material) {
    if (material._materialIndex >= 0) return;
    const units = this._units(material);
    let index = this._freePlaces.get(units)?.pop();
    if (index === void 0) {
      const endBytes = (this._end + units) * this._alignment;
      if (endBytes > this.data.byteLength) this._expand(endBytes / 4);
      index = this._end * this._texelsPerUnit;
      this._end += units;
    }
    material._materialIndex = index;
  }
  /**
  * Retires the GPU views rather than destroying them, since a view that drew earlier this frame
  * still binds them; `destroy` frees them
  */
  _expand(minSize) {
    let newSize = this.data.length * 2;
    if (newSize < minSize) newSize = minSize;
    newSize = alignToDataTextureRows(newSize);
    const newData = new Float32Array(newSize);
    newData.set(this.data);
    this.data = newData;
    this._retiredTextures.push(this.texture);
    this.texture = new Texture({ source: createDataTextureSource(this.data) });
    if (this._buffer) {
      this._retiredBuffers.push(this._buffer);
      this._buffer = null;
    }
    this.bufferVersion++;
  }
};
const FLOATS_PER_DELTA = 4;
var MorphStoreBuffer = class {
  data;
  _buffer = null;
  _bufferResource = null;
  /** Bumped when growth replaces the buffer, so whatever bound the old one must bind again */
  bufferVersion = 0;
  _deltaCursor = 0;
  /** The arena's capacity, which is also the weights base; weight slots are relative to it */
  _deltaCapacity = 0;
  _weightCursor = 0;
  _freeSlots = /* @__PURE__ */ new Map();
  _freeDeltaBlocks = /* @__PURE__ */ new Map();
  _minDirty = Infinity;
  _maxDirty = -Infinity;
  _retiredBuffers = [];
  _texture = null;
  _textureSource = null;
  constructor(options = {}) {
    this._deltaCapacity = options.deltaCapacity ?? 4096;
    const weightCapacity = alignWeightCapacity(this._deltaCapacity, options.weightCapacity ?? 1024);
    this.data = new Float32Array(this._deltaCapacity + weightCapacity);
  }
  get buffer() {
    return this._buffer ??= new Buffer3D({
      data: this.data,
      usage: BufferUsage.STORAGE | BufferUsage.COPY_DST | BufferUsage.COPY_SRC,
      label: "MorphStoreBuffer",
      shrinkToFit: false
    });
  }
  get bufferResource() {
    return this._bufferResource ??= new BufferResource({ buffer: this.buffer });
  }
  get texture() {
    return this._texture || this._initTexture();
  }
  /**
  * Target `i`'s delta for vertex `vid` sits at `base + (vid * targetCount + i) * stride`, as the morph
  * bits read it. Releases the raw targets, so a geometry another store packed draws unmorphed here
  */
  uploadDeltas(geometry) {
    const old = geometry._morphStore;
    if (old === this) return;
    if (old) {
      old.freeDeltas(geometry);
      warn(`MorphStoreBuffer: geometry #${geometry.uid} was packed by another renderer and draws unmorphed here`);
      return;
    }
    const targets = geometry._morphTargets;
    if (!targets || targets.length === 0) return;
    const withNormals = geometry.hasMorphNormals;
    const stride = withNormals ? 8 : FLOATS_PER_DELTA;
    const targetCount = targets.length;
    const vertexCount = targets[0].positions.length / 3;
    const floats = vertexCount * targetCount * stride;
    const recycled = this._freeDeltaBlocks.get(floats);
    let base;
    if (recycled && recycled.length > 0) base = recycled.pop();
    else {
      base = this._deltaCursor;
      if (base + floats > this._deltaCapacity) this._growArena(base + floats);
      this._deltaCursor += floats;
    }
    const maxDeltaSq = new Float64Array(targetCount);
    const data = this.data;
    for (let vid = 0; vid < vertexCount; vid++) {
      const src = vid * 3;
      for (let i = 0; i < targetCount; i++) {
        const dst = base + (vid * targetCount + i) * stride;
        const p = targets[i].positions;
        const dx = p[src];
        const dy = p[src + 1];
        const dz = p[src + 2];
        data[dst] = dx;
        data[dst + 1] = dy;
        data[dst + 2] = dz;
        data[dst + 3] = 0;
        const lengthSq = dx * dx + dy * dy + dz * dz;
        if (lengthSq > maxDeltaSq[i]) maxDeltaSq[i] = lengthSq;
        if (withNormals) {
          const n = targets[i].normals;
          data[dst + 4] = n[src];
          data[dst + 5] = n[src + 1];
          data[dst + 6] = n[src + 2];
          data[dst + 7] = 0;
        }
      }
    }
    let expansion = 0;
    for (let i = 0; i < targetCount; i++) expansion += Math.sqrt(maxDeltaSq[i]);
    geometry._morphBoundsExpansion = expansion;
    geometry._morphDeltaBase = base;
    geometry._morphDeltaFloats = floats;
    geometry._morphStore = this;
    geometry._morphTargets = null;
    this._markDirty(base, base + floats - 1);
  }
  /** The release for `uploadDeltas`, from `Geometry3D.destroy`; once the store is destroyed it only resets the geometry */
  freeDeltas(geometry) {
    const base = geometry._morphDeltaBase;
    if (base < 0) return;
    const floats = geometry._morphDeltaFloats;
    geometry._morphDeltaBase = -1;
    geometry._morphDeltaFloats = 0;
    geometry._morphStore = null;
    if (!this.data) return;
    recycle(this._freeDeltaBlocks, floats, base);
  }
  /** Packs every geometry before placing any weights, since arena growth moves the weights base */
  sync(morphedMeshes) {
    for (let i = 0; i < morphedMeshes.length; i++) this.uploadDeltas(morphedMeshes[i].geometry);
    const weightsBase = this._deltaCapacity;
    for (let i = 0; i < morphedMeshes.length; i++) {
      const mesh = morphedMeshes[i];
      const morph = mesh._morph;
      if (morph._store !== this) {
        morph._store?.freeSlot(morph);
        this.allocSlot(morph);
      }
      const absolute = weightsBase + morph._slot;
      if (morph._weightIndex !== absolute) {
        morph._weightIndex = absolute;
        mesh._markStoreDirty();
      }
      this.writeWeights(morph);
    }
    this.update();
  }
  allocSlot(morph) {
    let size = 1;
    while (size < morph.weights.length) size <<= 1;
    const free = this._freeSlots.get(size);
    let slot;
    if (free && free.length > 0) slot = free.pop();
    else {
      slot = this._weightCursor;
      if (this._deltaCapacity + slot + size > this.data.length) this._growWeights(slot + size);
      this._weightCursor += size;
    }
    morph._slot = slot;
    morph._slotSize = size;
    morph._store = this;
  }
  /** Once the store is destroyed it only resets the morph */
  freeSlot(morph) {
    const slot = morph._slot;
    if (slot < 0) return;
    const size = morph._slotSize;
    morph._slot = -1;
    morph._slotSize = 0;
    morph._store = null;
    if (!this.data) return;
    recycle(this._freeSlots, size, slot);
  }
  /**
  * Marks the slot for upload only when a copied value differs, the only change tracking weights have;
  * the copy stops at the slot's size, in case `weights` grew
  */
  writeWeights(morph) {
    const weights = morph.weights;
    const data = this.data;
    const base = this._deltaCapacity + morph._slot;
    const count = Math.min(weights.length, morph._slotSize);
    let changed = false;
    for (let i = 0; i < count; i++) {
      const value = weights[i];
      if (data[base + i] !== value) {
        data[base + i] = value;
        changed = true;
      }
    }
    if (changed) this._markDirty(base, base + count - 1);
  }
  update() {
    if (this._minDirty > this._maxDirty) return;
    this._buffer?.update((this._maxDirty - this._minDirty + 1) * 4, this._minDirty * 4);
    if (this._textureSource) uploadFloatRange(this._textureSource, this._minDirty, this._maxDirty + 1);
    this._minDirty = Infinity;
    this._maxDirty = -Infinity;
  }
  _freeRetired() {
    for (let i = 0; i < this._retiredBuffers.length; i++) this._retiredBuffers[i].destroy();
    this._retiredBuffers.length = 0;
  }
  destroy() {
    if (!this.data) return;
    this._bufferResource?.destroy(false);
    this._buffer?.destroy();
    this._freeRetired();
    this._texture?.destroy(true);
    this._texture = null;
    this._textureSource = null;
    this.data = null;
    this._buffer = null;
    this._bufferResource = null;
  }
  _markDirty(from, to) {
    if (from < this._minDirty) this._minDirty = from;
    if (to > this._maxDirty) this._maxDirty = to;
  }
  _growArena(requiredFloats) {
    let capacity = this._deltaCapacity;
    while (capacity < requiredFloats) capacity *= 2;
    this._reallocate(capacity, this.data.length - this._deltaCapacity);
  }
  _growWeights(requiredFloats) {
    let capacity = this.data.length - this._deltaCapacity;
    while (capacity < requiredFloats) capacity *= 2;
    this._reallocate(this._deltaCapacity, capacity);
  }
  /** Retires the buffer rather than destroying it, since draws recorded earlier still bind it; `destroy` frees it */
  _reallocate(newDeltaCapacity, newWeightCapacity) {
    newWeightCapacity = alignWeightCapacity(newDeltaCapacity, newWeightCapacity);
    const newData = new Float32Array(newDeltaCapacity + newWeightCapacity);
    newData.set(this.data.subarray(0, this._deltaCursor), 0);
    newData.set(this.data.subarray(this._deltaCapacity, this._deltaCapacity + this._weightCursor), newDeltaCapacity);
    this.data = newData;
    this._deltaCapacity = newDeltaCapacity;
    if (this._buffer) {
      this._retiredBuffers.push(this._buffer);
      this._buffer = null;
      this._bufferResource = null;
    }
    this.bufferVersion++;
    if (this._textureSource) {
      const { width, height } = dataTextureSize(this.data.length);
      this._textureSource.resource = this.data;
      if (this._textureSource.width !== width || this._textureSource.height !== height) this._textureSource.resize(width, height);
      this._textureSource.update();
    }
  }
  _initTexture() {
    const { width, height } = dataTextureSize(this.data.length);
    this._textureSource = new BufferImageSource({
      resource: this.data,
      width,
      height,
      format: "rgba32float",
      scaleMode: "nearest",
      alphaMode: "no-premultiply-alpha"
    });
    this._texture = new Texture({ source: this._textureSource });
    return this._texture;
  }
};
function recycle(lists, size, offset) {
  let free = lists.get(size);
  if (!free) {
    free = [];
    lists.set(size, free);
  }
  free.push(offset);
}
function alignWeightCapacity(deltaCapacity, weightCapacity) {
  const total = deltaCapacity + weightCapacity;
  return weightCapacity + (alignToDataTextureRows(total) - total);
}
function resolveCullProducer(mode, gpuCompaction) {
  return mode === "gpu" && !gpuCompaction ? "cpu" : mode;
}
const cpuSubmission = {};
const CPU_SUBMISSION_WEBKIT = {
  forward: 5e4,
  shadow: 2e4
};
let _webKit;
function cpuSubmissionLimit(pass) {
  const set = cpuSubmission[pass];
  if (set !== void 0) return set;
  _webKit ??= isMobile.apple.device || isSafari();
  return _webKit ? CPU_SUBMISSION_WEBKIT[pass] : 0;
}
const _batchPlanes = /* @__PURE__ */ new Float32Array(24);
function transformFrustumToBatch(planes, f32) {
  const b00 = f32[0];
  const b01 = f32[1];
  const b02 = f32[2];
  const b10 = f32[4];
  const b11 = f32[5];
  const b12 = f32[6];
  const b20 = f32[8];
  const b21 = f32[9];
  const b22 = f32[10];
  const btx = f32[12];
  const bty = f32[13];
  const btz = f32[14];
  if (b00 === 1 && b11 === 1 && b22 === 1 && b01 === 0 && b02 === 0 && b10 === 0 && b12 === 0 && b20 === 0 && b21 === 0 && btx === 0 && bty === 0 && btz === 0) return planes;
  for (let p = 0; p < 6; p++) {
    const o = p * 4;
    const nx = planes[o];
    const ny = planes[o + 1];
    const nz = planes[o + 2];
    const tx = b00 * nx + b01 * ny + b02 * nz;
    const ty = b10 * nx + b11 * ny + b12 * nz;
    const tz = b20 * nx + b21 * ny + b22 * nz;
    const inv = 1 / Math.sqrt(tx * tx + ty * ty + tz * tz);
    _batchPlanes[o] = tx * inv;
    _batchPlanes[o + 1] = ty * inv;
    _batchPlanes[o + 2] = tz * inv;
    _batchPlanes[o + 3] = (btx * nx + bty * ny + btz * nz + planes[o + 3]) * inv;
  }
  return _batchPlanes;
}
function detectSharedCacheInvalidation(atlases, materialStore, data, morphStore, geometryStore) {
  let invalidated = false;
  if (data.lastAtlasBufferVersion !== atlases.bufferVersion) {
    data.lastAtlasBufferVersion = atlases.bufferVersion;
    invalidated = true;
  }
  if (data.lastMaterialStoreBufferVersion !== materialStore.bufferVersion) {
    data.lastMaterialStoreBufferVersion = materialStore.bufferVersion;
    invalidated = true;
  }
  if (data.lastMorphStoreBufferVersion !== morphStore.bufferVersion) {
    data.lastMorphStoreBufferVersion = morphStore.bufferVersion;
    invalidated = true;
  }
  if (geometryStore && data.lastGeometryStoreBufferVersion !== geometryStore.bufferVersion) {
    data.lastGeometryStoreBufferVersion = geometryStore.bufferVersion;
    invalidated = true;
  }
  return invalidated;
}
const CASCADE_BLEND_FRACTION = 0.1;
const _invViewProj = new Matrix4();
const _lightSpaceFromClip = new Matrix4();
const _sliceBounds = /* @__PURE__ */ new Float64Array(4);
function computeCascadeSplits(near, far, count, lambda, out) {
  out.length = count;
  for (let i = 1; i <= count; i++) {
    const t = i / count;
    const log = near * Math.pow(far / near, t);
    const uniform = near + (far - near) * t;
    out[i - 1] = lambda * log + (1 - lambda) * uniform;
  }
  return out;
}
function prepareLightSpaceTransform(camera, inverseLightMatrix) {
  _invViewProj.getInverse(camera.viewProjection);
  _lightSpaceFromClip.multiplyMatrices(inverseLightMatrix, _invViewProj);
}
function getFrustumSliceBoundsInLightSpace(nearZ, farZ) {
  const e = _lightSpaceFromClip.elements;
  let minZ = Infinity;
  let maxZ = -Infinity;
  let sumX = 0;
  let sumY = 0;
  for (let k = 0; k < 2; k++) {
    const nz = k === 0 ? nearZ : farZ;
    for (let iy = -1; iy <= 1; iy += 2) for (let ix = -1; ix <= 1; ix += 2) {
      const x = e[0] * ix + e[4] * iy + e[8] * nz + e[12];
      const y = e[1] * ix + e[5] * iy + e[9] * nz + e[13];
      const z = e[2] * ix + e[6] * iy + e[10] * nz + e[14];
      const w = e[3] * ix + e[7] * iy + e[11] * nz + e[15];
      const lz = z / w;
      sumX += x / w;
      sumY += y / w;
      if (lz < minZ) minZ = lz;
      if (lz > maxZ) maxZ = lz;
    }
  }
  _sliceBounds[0] = minZ;
  _sliceBounds[1] = maxZ;
  _sliceBounds[2] = sumX * 0.125;
  _sliceBounds[3] = sumY * 0.125;
}
function distanceToNdcZ(camera, distance) {
  const proj = camera.projection.elements;
  return (proj[10] * -distance + proj[14]) / (proj[11] * -distance + proj[15]);
}
function applyOrthoZRange01(projection, near, far) {
  const te = projection.elements;
  const zScale = 1 / (near - far);
  te[10] = zScale;
  te[14] = near * zScale;
}
function snapCentreToTexel(centre, halfExtent, mapSize) {
  const texelWorld = 2 * halfExtent / mapSize;
  return Math.floor(centre / texelWorld) * texelWorld;
}
function computeCascadeMatrix(camera, splitNear, splitFar, outProjection, mapSize, applyWebGPUZRangeFix = true) {
  getFrustumSliceBoundsInLightSpace(distanceToNdcZ(camera, splitNear), distanceToNdcZ(camera, splitFar));
  const pe = camera.projection.elements;
  const spread = camera.mode === "orthographic" ? 1 : splitFar;
  const halfFarH = spread / pe[5];
  const halfFarW = spread / pe[0];
  const halfDepth = (splitFar - splitNear) * 0.5;
  const r = Math.sqrt(halfFarW * halfFarW + halfFarH * halfFarH + halfDepth * halfDepth);
  const near = -_sliceBounds[1] - r * DEPTH_EXTENSION;
  const far = -_sliceBounds[0];
  const centreX = snapCentreToTexel(_sliceBounds[2], r, mapSize);
  const centreY = snapCentreToTexel(_sliceBounds[3], r, mapSize);
  outProjection.makeOrthographic(centreX - r, centreX + r, centreY + r, centreY - r, near, far);
  if (applyWebGPUZRangeFix) applyOrthoZRange01(outProjection, near, far);
}
const _lightSpaceBox = new Box();
const DEPTH_EXTENSION = 4;
function computeFixedBoxMatrix(boundsWorld, inverseLightMatrix, outProjection, mapSize, applyWebGPUZRangeFix = true) {
  boundsWorld.applyMatrix4(inverseLightMatrix, _lightSpaceBox);
  const { min, max } = _lightSpaceBox;
  const halfX = (max.x - min.x) * 0.5 * 1.1;
  const halfY = (max.y - min.y) * 0.5 * 1.1;
  const centreX = snapCentreToTexel((min.x + max.x) * 0.5, halfX, mapSize);
  const centreY = snapCentreToTexel((min.y + max.y) * 0.5, halfY, mapSize);
  const near = -max.z - Math.max(halfX, halfY) * DEPTH_EXTENSION;
  const far = -min.z;
  outProjection.makeOrthographic(centreX - halfX, centreX + halfX, centreY + halfY, centreY - halfY, near, far);
  if (applyWebGPUZRangeFix) applyOrthoZRange01(outProjection, near, far);
}
function createGlobalUniformGroup(lightData, shadowData, extra) {
  return new UniformGroup({
    uGlobalLightParams: {
      value: new Float32Array([
        0,
        0,
        0,
        0
      ]),
      type: "vec4<f32>"
    },
    uTime: {
      value: 0,
      type: "f32"
    },
    uFogColor: {
      value: new Float32Array([
        0,
        0,
        0
      ]),
      type: "vec3<f32>"
    },
    uDisplayExposure: {
      value: 1,
      type: "f32"
    },
    uFogParams: {
      value: new Float32Array([
        0,
        0,
        0
      ]),
      type: "vec3<f32>"
    },
    uExposure: {
      value: 1,
      type: "f32"
    },
    uHemisphereSky: {
      value: new Float32Array([
        0,
        0,
        0
      ]),
      type: "vec3<f32>"
    },
    uHemisphereGround: {
      value: new Float32Array([
        0,
        0,
        0
      ]),
      type: "vec3<f32>"
    },
    uHemisphereUp: {
      value: new Float32Array([
        0,
        1,
        0
      ]),
      type: "vec3<f32>"
    },
    ...extra,
    uLightData: {
      value: lightData,
      type: "vec4<f32>",
      size: 128
    },
    uShadowData: {
      value: shadowData,
      type: "vec4<f32>",
      size: MAX_SHADOW_SLOTS * 6
    }
  }, {
    isStatic: true,
    ubo: true
  });
}
const brdfLutGlslTemplate = {
  gl: {
    vertex: `#version 300 es
      {{header}}
      void main() {
          gl_Position = vec4(aPosition, 0.0, 1.0);
          vUv = aPosition * 0.5 + 0.5;
      }
    `,
    fragment: `#version 300 es
      {{header}}

      float geometrySchlickGGX(float NdotV, float roughness) {
          float a = roughness;
          float k = (a * a) / 2.0;
          return NdotV / (NdotV * (1.0 - k) + k);
      }

      float geometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
          float NdotV = max(dot(N, V), 0.0);
          float NdotL = max(dot(N, L), 0.0);
          float ggx1 = geometrySchlickGGX(NdotV, roughness);
          float ggx2 = geometrySchlickGGX(NdotL, roughness);
          return ggx1 * ggx2;
      }

      vec2 integrateBRDF(float NdotV, float roughness, uint sampleCount) {
          vec3 V = vec3(sqrt(1.0 - NdotV * NdotV), 0.0, NdotV);
          vec3 N = vec3(0.0, 0.0, 1.0);

          float A = 0.0;
          float B = 0.0;

          for(uint i = 0u; i < sampleCount; i++) {
              vec2 Xi = hammersley(i, sampleCount);
              vec3 H = importanceSampleGGX(Xi, N, roughness);
              vec3 L = normalize(2.0 * dot(V, H) * H - V);

              float NdotL = max(L.z, 0.0);
              float NdotH = max(H.z, 0.0);
              float VdotH = max(dot(V, H), 0.0);

              if(NdotL > 0.0) {
                  float G = geometrySmith(N, V, L, roughness);
                  float G_Vis = (G * VdotH) / (NdotH * NdotV);
                  float Fc = pow(1.0 - VdotH, 5.0);

                  A += (1.0 - Fc) * G_Vis;
                  B += Fc * G_Vis;
              }
          }

          return vec2(A / float(sampleCount), B / float(sampleCount));
      }

      out vec4 fragColor;

      void main() {
          float NdotV = vUv.x;
          float roughness = vUv.y;
          float clampedNdotV = max(NdotV, 0.001);
          float clampedRoughness = max(roughness, 0.01);
          
          vec2 result = integrateBRDF(clampedNdotV, clampedRoughness, uint(sampleCount));
          fragColor = vec4(result.x, result.y, 0.0, 1.0);
      }
    `
  }
};
const brdfLutWgslTemplate = {
  gpu: `
{{header}}

fn geometrySchlickGGX(NdotV: f32, roughness: f32) -> f32 {
   let a = roughness;
   let k = (a * a) / 2.0;
   
   return NdotV / (NdotV * (1.0 - k) + k);
}

fn geometrySmith(N: vec3<f32>, V: vec3<f32>, L: vec3<f32>, roughness: f32) -> f32 {
   let NdotV = max(dot(N, V), 0.0);
   let NdotL = max(dot(N, L), 0.0);
   let ggx1 = geometrySchlickGGX(NdotV, roughness);
   let ggx2 = geometrySchlickGGX(NdotL, roughness);
   
   return ggx1 * ggx2;
}

fn integrateBRDF(NdotV: f32, roughness: f32, sampleCount: u32) -> vec2<f32> {
   let V = vec3<f32>(sqrt(1.0 - NdotV * NdotV), 0.0, NdotV);
   let N = vec3<f32>(0.0, 0.0, 1.0);
   
   var A = 0.0;
   var B = 0.0;
   
   for (var i = 0u; i < sampleCount; i++) {
       let Xi = hammersley(i, sampleCount);
       let H = importanceSampleGGX(Xi, N, roughness);
       let L = normalize(2.0 * dot(V, H) * H - V);
       
       let NdotL = max(L.z, 0.0);
       let NdotH = max(H.z, 0.0);
       let VdotH = max(dot(V, H), 0.0);
       
       if NdotL > 0.0 {
           let G = geometrySmith(N, V, L, roughness);
           let G_Vis = (G * VdotH) / (NdotH * NdotV);
           let Fc = pow(1.0 - VdotH, 5.0);
           
           A += (1.0 - Fc) * G_Vis;
           B += Fc * G_Vis;
       }
   }
   
   A = A / f32(sampleCount);
   B = B / f32(sampleCount);
   
   return vec2<f32>(A, B);
}

@vertex
fn mainVertex(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  output.position = vec4<f32>(input.aPosition, 0.0, 1.0);
  output.vUv = vec2<f32>(input.aPosition.x * 0.5 + 0.5, -input.aPosition.y * 0.5 + 0.5);
  return output;
}

@fragment
fn mainFragment(input: FragmentInput) -> @location(0) vec4<f32> {
   let NdotV = input.vUv.x;
   let roughness = input.vUv.y;
   
   let clampedNdotV = max(NdotV, 0.001);
   
   let clampedRoughness = max(roughness, 0.01);
   
   let result = integrateBRDF(clampedNdotV, clampedRoughness, u32(local.sampleCount));
   
   return vec4<f32>(result.x, result.y, 0.0, 1.0);
}
`
};
const brdfLutTemplate = {
  bindGroups: ["local"],
  gpu: brdfLutWgslTemplate.gpu,
  gl: brdfLutGlslTemplate.gl
};
function generateBrdfLut(options) {
  const { renderer } = options;
  const size = options.size ?? 256;
  const sampleCount = options.sampleCount ?? 1024;
  const localBit = {
    name: "brdfLut",
    requires: [iblSamplingFuncsBit],
    attributes: { aPosition: "float32x2" },
    interStage: { vUv: "vec2<f32>" },
    bindings: { local: { sampleCount: "f32" } }
  };
  const local = new BindGroup({ local: new UniformGroup({ sampleCount: {
    value: sampleCount,
    type: "f32"
  } }) });
  const shader = renderer.material3d.compileIsolatedShader([localBit], brdfLutTemplate, { 0: local });
  const textureSource = RenderTexture.create({
    width: size,
    height: size,
    format: "rg16float"
  }).source;
  const texture = new Texture({ source: textureSource });
  const geometry = fullscreenTriangleGeometry();
  const savedBind = renderer.renderTarget.renderTarget ? renderer.renderTarget.getBindState() : null;
  renderer.renderTarget.bind({
    target: textureSource,
    clear: true
  });
  renderer.encoder.draw({
    geometry,
    shader,
    state: State.default2d
  });
  if (savedBind) renderer.renderTarget.bind(savedBind);
  local.destroy();
  shader.destroy();
  return texture;
}
const scratchBind = {
  target: null,
  clear: CLEAR.NONE
};
const scratchViewport = new Rectangle();
const colorOutputBit = {
  name: "colorOutputDraw",
  attributes: { aPosition: "float32x2" },
  bindings: { local: {
    uSource: "texture_2d<f32>",
    uOffset: "vec2<f32>"
  } }
};
const colorOutputTemplate = {
  bindGroups: ["local"],
  gpu: `
{{header}}

@vertex
fn mainVertex(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  output.position = vec4<f32>(input.aPosition, 0.0, 1.0);
  return output;
}

@fragment
fn mainFragment(input: FragmentInput) -> @location(0) vec4<f32> {
  let fxColor = textureLoad(uSource, vec2<i32>(input.position.xy + local.uOffset), 0);
  var finalColor = fxColor.rgb;
  {{fragmentEnd}}
  return vec4<f32>(finalColor, fxColor.a);
}
`,
  gl: {
    vertex: `#version 300 es

{{header}}

void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`,
    fragment: `#version 300 es

{{header}}

out vec4 fragColor;

void main() {
  vec4 fxColor = texelFetch(uSource, ivec2(gl_FragCoord.xy + uOffset), 0);
  vec3 finalColor = fxColor.rgb;
  {{end}}
  fragColor = vec4(finalColor, fxColor.a);
}
`
  }
};
var ColorOutputDraw = class {
  _renderer;
  _uniforms = new UniformGroup({ uOffset: {
    value: /* @__PURE__ */ new Float32Array(2),
    type: "vec2<f32>"
  } });
  _bindGroup;
  _shaders = /* @__PURE__ */ new Map();
  _state;
  constructor(renderer) {
    this._renderer = renderer;
    this._bindGroup = new BindGroup({
      local: this._uniforms,
      uSource: Texture.WHITE.source
    });
    const state = new State();
    state.blend = false;
    state.depthTest = false;
    state.depthMask = false;
    state.culling = false;
    this._state = state;
  }
  /**
  * Clears only a `noFrame` dest, sparing tile GPUs a read-back; a clear would wipe the rest of a framed one's texture
  *
  * Puts the placeholder back after, so the bind group never keeps a pooled texture the pool may destroy.
  * @param pipe - The pipe drawing it
  * @param source - The camera's draw target and its content rect, in physical pixels
  * @param dest - The texture to fill
  * @param toneMapping - The tone mapping to apply, or `null` to change the format only
  */
  draw(pipe, source, dest, toneMapping) {
    const renderer = this._renderer;
    const { viewport } = source;
    const frame = dest.frame;
    const resolution = dest.source.resolution;
    const x = Math.round(frame.x * resolution);
    const y = Math.round(frame.y * resolution);
    const offset = this._uniforms.uniforms.uOffset;
    offset[0] = viewport.x - x;
    offset[1] = viewport.y - y;
    this._uniforms.update();
    const ubo = "uniformBatch" in renderer.renderPipes ? renderer.renderPipes.uniformBatch.getUboResource(this._uniforms) : this._uniforms;
    this._bindGroup.setResource(ubo, "local");
    this._bindGroup.setResource(source.target.colorTexture, "uSource");
    let shader = this._shaders.get(toneMapping);
    if (!shader) {
      shader = renderer.material3d.compileIsolatedShader([colorOutputBit, ...toneOutputBits(toneMapping)], colorOutputTemplate, { 0: this._bindGroup });
      this._shaders.set(toneMapping, shader);
    }
    scratchBind.target = dest;
    scratchBind.clear = dest.noFrame ? CLEAR.COLOR : CLEAR.NONE;
    renderer.renderTarget.bind(scratchBind);
    scratchBind.target = null;
    pipe.setViewport(scratchViewport.set(x, y, viewport.width, viewport.height));
    pipe.renderGeometry(fullscreenTriangleGeometry(), shader, this._state);
    this._bindGroup.setResource(Texture.WHITE.source, "uSource");
  }
  destroy() {
    for (const shader of this._shaders.values()) shader.destroy();
    this._shaders = null;
    this._bindGroup.destroy();
  }
};
function cachesDrawWork(desc) {
  return (desc.cache ?? (desc.sort === "key" ? "auto" : "never")) === "auto";
}
const tempEyeMatrix = new Matrix4();
const tempEye = new Vector3();
const _scratchSphere = new Sphere();
const _scratchBox = new Box();
const _scratchVec = new Vector3();
const DEFAULT_SHADOW_BIAS = 1e-3;
const SPOT_SHADOW_NORMAL_BIAS = 0.15;
const SHADOW_NORMAL_BIAS_TEXELS = 3;
const DEFAULT_CASCADE_MAX_DISTANCE = 50;
const SHADOW_SOFT_TEXEL_THRESHOLD = 0.15;
const MAX_AUTO_FIT_CASTERS = 256;
const WARN_BOUNDS_WITH_CASCADES = "Shadow: shadow.bounds and shadow.cascades are both set — cascades take precedence and the bounds box is ignored. Use bounds for a fixed region or cascades for a camera-following shadow, not both.";
const WARN_SHADOW_BOX_LARGE = "Shadow auto-fit box spans a large scene, so shadows may look soft. Raise view3d.shadowQuality, set light.shadow.bounds to the area that needs shadows, or, for a scene the camera roams across, enable cascades: light.shadow.cascades = 3.";
const WARN_SHADOW_BUDGET = `Too many shadow maps for the shadow budget of ${MAX_SHADOW_SLOTS}: each shadow-casting light takes one, or one per cascade. Lights past the budget render without shadows.`;
var ShadowRenderPassBase = class extends RenderPass {
  _renderTarget = null;
  /** Layers the shadow map holds: the most slots claimed, never shrinking, since each growth re-records every bundle */
  _layerCount = 0;
  _quality = "medium";
  _frameCount = 0;
  _hasCastersValue = false;
  _hasCastersFrame = -1;
  _sceneCasterBounds = new Box();
  _sceneBoundsFrame = -1;
  _destroyed = false;
  /**
  * Bumped when the map's contents are discarded; each light's `ShadowData.targetVersion` records the
  * one its layers hold
  */
  targetVersion = 0;
  /** Kept so `unload`, which runs outside a frame, can unbind the map it frees */
  _view3d = null;
  /** The graph's handle on the shadow map, imported in `createDefaultGraph3D` */
  shadowMapHandle;
  constructor(options) {
    super(options);
    this.shadowMapHandle = options.shadowMapHandle;
  }
  /** The shadow map's render target, created on first use */
  get renderTarget() {
    if (this._renderTarget === null) this._renderTarget = createShadowRenderTarget(this._quality, Math.max(this._layerCount, 1));
    return this._renderTarget;
  }
  /**
  * Grows the shadow map to cover `slots` layers; called as slots are claimed, before the graph
  * runs, so the frame that needs more layers gets them
  */
  _growAtlas(slots) {
    if (slots <= this._layerCount) return;
    this._layerCount = Math.min(slots, MAX_SHADOW_SLOTS);
    this._releaseTarget();
  }
  /** The shadow quality tier; a change frees the map, and the next access makes one at the new size */
  set quality(value) {
    if (value === this._quality) return;
    this._quality = value;
    this._releaseTarget();
  }
  get quality() {
    return this._quality;
  }
  /**
  * Start-of-frame bookkeeping; the lighting system calls it every frame, even when the pass is
  * skipped, and nothing is bound yet, so a new `shadowQuality` can free the map here
  */
  beginFrame(view3d) {
    this._view3d = view3d;
    this.quality = view3d.shadowQuality;
    this._frameCount++;
    view3d._shadowDataList.reset();
  }
  /** Frees the shadow map; the next frame that needs shadows makes it again and every light re-renders */
  unload() {
    this._releaseTarget();
  }
  /**
  * Unbinds the map before destroying it, so no bundle replays the freed view; pixi's
  * `RenderTarget.destroy` leaves a depth texture it was handed
  */
  _releaseTarget() {
    const target = this._renderTarget;
    if (!target) return;
    this._renderTarget = null;
    this.targetVersion++;
    if (this._view3d) this._bindShadowSource(this._view3d, DEPTH_EMPTY.source);
    const shadowMap = target.depthStencilTexture;
    target.destroy();
    shadowMap.destroy();
  }
  /**
  * Points the view's global shadow-map slot at `source`, re-recording every bundle in the view on a
  * change; it compares with the slot itself, since the view can re-create its global group
  */
  _bindShadowSource(view3d, source) {
    const { group, slot } = view3d._graph.globalTextureBindings.shadowMap;
    if (group.getResource(slot) === source) return;
    group.setResource(source, slot);
    view3d._invalidateBundleCaches();
  }
  /** Declares the shadow map as a produce, so the graph binds no target and the pass binds its own layers */
  setup(b) {
    b.produce(this.shadowMapHandle);
  }
  /**
  * Skips the frame when no light can cast or no mesh is in the shadow pass; hidden casters count,
  * so the WebGPU pass still releases a hidden light's cull results for batches that left the view
  */
  condition(session) {
    const lights = session.lights;
    for (let i = 0; i < lights.length; i++) if (lights[i].canCastShadow) return this._hasCasters(session.view3d);
    return false;
  }
  /** Whether any mesh is in the shadow pass this frame, hidden ones included; read once per frame */
  _hasCasters(view3d) {
    if (this._hasCastersFrame === this._frameCount) return this._hasCastersValue;
    this._hasCastersFrame = this._frameCount;
    const batches = view3d._meshBatches;
    let hasCasters = false;
    for (let i = 0; i < batches.length && !hasCasters; i++) hasCasters = (batches[i].drawLists[this.bit]?.view.count ?? 0) > 0;
    this._hasCastersValue = hasCasters;
    return hasCasters;
  }
  /** The light's shadow data, created on first use */
  getShadowGPUData(light) {
    return light._gpuShadowData ??= {
      inverseLightMatrix: new Matrix4(),
      lightProjectionMatrix: new Matrix4(),
      /** Current from the start; a new light's first layers come from `_shadowRefreshRequested` */
      targetVersion: this.targetVersion
    };
  }
  /**
  * The light's cascade slot, created on first use with a camera group of its own: WebGPU's
  * `writeBuffer` calls all land before the bundles run, so a shared group would draw every cascade alike
  */
  _cascadeSlot(light, cascadeIndex) {
    const cascades = this.getShadowGPUData(light).cascades ??= [];
    return cascades[cascadeIndex] ??= {
      cameraData: new CameraData(),
      bias: 0,
      normalBias: 0,
      mapSize: 0,
      cascadeCount: 0,
      splits: null,
      needsRender: true
    };
  }
  /**
  * Writes a fitted cascade's matrices and cull volume into its camera data, so a cascade throttled
  * off later frames keeps a frustum that matches its frozen matrices
  */
  _commitCascadeCamera(slot, view, projection) {
    tempEyeMatrix.getInverse(view);
    tempEyeMatrix.extractPosition(tempEye);
    const cameraData = slot.cameraData;
    cameraData.set(tempEye, view, projection);
    cameraData.frustum.setFromProjectionMatrix(cameraData.viewProjection);
  }
  /**
  * Fits a light's shadow and fills its cascade slots for `uShadowData`; a cascade its update rate
  * skips keeps its matrices, and re-renders only when the map was discarded since
  */
  updateLightShadowData(light, view3d) {
    if (!light.canCastShadow) return;
    const camera = view3d.camera;
    const shadowData = this.getShadowGPUData(light);
    const { inverseLightMatrix, lightProjectionMatrix } = shadowData;
    const targetStale = shadowData.targetVersion !== this.targetVersion;
    const mapSize = SHADOW_QUALITY_SIZE[this._quality];
    const forceUpdate = light._shadowRefreshRequested;
    const update = light.shadow.update;
    const bias = light.shadow.bias ?? DEFAULT_SHADOW_BIAS;
    if (light.type === "spot" || light.shadow.cascades === void 0) {
      const slot = this._cascadeSlot(light, 0);
      const renderSkip = cascadeRenderSkip(updateRateFor(update, 0), this._frameCount, forceUpdate);
      if (!renderSkip) {
        if (light.type === "spot") {
          updateSpotShadowMatrices(light, inverseLightMatrix, lightProjectionMatrix, this._applyZRangeFix);
          this._commitCascadeCamera(slot, inverseLightMatrix, lightProjectionMatrix);
          slot.normalBias = light.shadow.normalBias ?? SPOT_SHADOW_NORMAL_BIAS;
        } else {
          const bounds = light.shadow.bounds ?? this._resolveAutoShadowBounds(light, view3d, mapSize);
          if (bounds !== void 0 && !bounds.isEmpty()) {
            inverseLightMatrix.getInverse(light.worldTransform);
            computeFixedBoxMatrix(bounds, inverseLightMatrix, lightProjectionMatrix, mapSize, this._applyZRangeFix);
            this._commitCascadeCamera(slot, inverseLightMatrix, lightProjectionMatrix);
            slot.normalBias = this._resolveNormalBias(light, lightProjectionMatrix, mapSize);
          }
        }
      }
      slot.bias = bias;
      slot.mapSize = mapSize;
      slot.cascadeCount = 0;
      slot.splits = null;
      slot.needsRender = targetStale || !renderSkip;
      return;
    }
    if (light.shadow.bounds !== void 0) warnOnce("pixijs-3d-shadow-bounds-cascades", WARN_BOUNDS_WITH_CASCADES);
    inverseLightMatrix.getInverse(light.worldTransform);
    const cascadeCount = cascadeCountFor(light);
    const lambda = light.shadow.lambda;
    const maxDist = Math.min(light.shadow.maxDistance ?? DEFAULT_CASCADE_MAX_DISTANCE, camera.far);
    const cascade0 = this._cascadeSlot(light, 0);
    const splits = cascade0.splits ??= [];
    computeCascadeSplits(camera.near, maxDist, cascadeCount, lambda, splits);
    prepareLightSpaceTransform(camera, inverseLightMatrix);
    for (let c = 0; c < cascadeCount; c++) {
      const slot = c === 0 ? cascade0 : this._cascadeSlot(light, c);
      const renderSkip = cascadeRenderSkip(updateRateFor(update, c), this._frameCount, forceUpdate);
      if (!renderSkip) {
        const splitNear = c === 0 ? camera.near : splits[c - 1];
        computeCascadeMatrix(camera, splitNear, splits[c], lightProjectionMatrix, mapSize, this._applyZRangeFix);
        this._commitCascadeCamera(slot, inverseLightMatrix, lightProjectionMatrix);
        slot.normalBias = this._resolveNormalBias(light, lightProjectionMatrix, mapSize);
      }
      slot.bias = bias;
      slot.mapSize = mapSize;
      slot.cascadeCount = c === 0 && cascadeCount > 1 ? cascadeCount : 0;
      if (c > 0) slot.splits = null;
      slot.needsRender = targetStale || !renderSkip;
    }
  }
  /**
  * Marks a light's layers current; the backends call it once the draws ran, so a refresh is marked
  * done only on a frame that drew the light
  */
  _completeShadowUpdate(light) {
    if (light._gpuShadowData) light._gpuShadowData.targetVersion = this.targetVersion;
    light._shadowRefreshRequested = false;
  }
  /** The auto-fit box of a directional light with no `shadow.bounds`, or `undefined` before any caster */
  _resolveAutoShadowBounds(light, view3d, mapSize) {
    const casterCount = this._countSceneCasters(view3d);
    const prev = light._autoShadowBounds;
    if (casterCount > MAX_AUTO_FIT_CASTERS && light._autoShadowBoundsFrozen) return prev ?? void 0;
    const gathered = this._ensureSceneCasterBounds(view3d);
    if (gathered.isEmpty()) return prev ?? void 0;
    const box = prev ?? (light._autoShadowBounds = new Box());
    box.copyFrom(gathered);
    if (casterCount <= MAX_AUTO_FIT_CASTERS) light._autoShadowBoundsFrozen = false;
    else {
      light._autoShadowBoundsFrozen = true;
      warnOnce("pixijs-3d-shadow-autofit-cap", `Shadow auto-fit: ${casterCount} shadow casters is over the auto-measure cap (${MAX_AUTO_FIT_CASTERS}), so the shadow box was fitted once and frozen. If casters move or spawn outside it, set shadow.bounds, enable shadow.cascades, or call light.fitShadowBounds() after changes.`);
    }
    this._warnIfShadowBoxLarge(box, mapSize);
    return box;
  }
  _countSceneCasters(view3d) {
    let count = 0;
    const batches = view3d._meshBatches;
    for (let b = 0; b < batches.length; b++) {
      const batch = batches[b];
      if (!batch.renderData._worldVisible) continue;
      const pd = batch.drawLists[this.bit];
      if (pd) count += pd.view.count;
    }
    return count;
  }
  /**
  * World-space box around every visible shadow caster, gathered once per frame; the scene batch,
  * always first, holds world-space spheres, and a {@link BatchedMesh3D}'s are batch-local
  */
  _ensureSceneCasterBounds(view3d) {
    if (this._sceneBoundsFrame === this._frameCount) return this._sceneCasterBounds;
    this._sceneBoundsFrame = this._frameCount;
    const box = this._sceneCasterBounds.makeEmpty();
    const batches = view3d._meshBatches;
    for (let b = 0; b < batches.length; b++) {
      const batch = batches[b];
      if (!batch.renderData._worldVisible) continue;
      const list = batch.drawLists[this.bit];
      if (!list || list.view.count === 0) continue;
      const batchMatrix = b === 0 ? null : batch.renderData.worldTransform;
      const items = list.view.items;
      const renderableIndices = list.view.renderableIndices;
      for (let i = 0; i < list.view.count; i++) {
        const item = items[renderableIndices[i]];
        if (item._worldVisible === 0) continue;
        const sphere = item.boundingSphere;
        if (sphere.radius < 0) continue;
        const world = batchMatrix ? sphere.applyMatrix4(batchMatrix, _scratchSphere) : sphere;
        box.union(world.getBounds(_scratchBox));
      }
    }
    return box;
  }
  _warnIfShadowBoxLarge(bounds, mapSize) {
    if (bounds.isEmpty()) return;
    const size = bounds.getSize(_scratchVec);
    if (Math.max(size.x, size.y, size.z) / mapSize > SHADOW_SOFT_TEXEL_THRESHOLD) warnOnce("pixijs-3d-shadow-autofit-large", WARN_SHADOW_BOX_LARGE);
  }
  /** The light's `shadow.normalBias`, else {@link SHADOW_NORMAL_BIAS_TEXELS} at the projection's texel size */
  _resolveNormalBias(light, orthoProjection, mapSize) {
    if (light.shadow.normalBias !== void 0) return light.shadow.normalBias;
    const texelWorld = 2 / (orthoProjection.elements[0] * mapSize);
    return SHADOW_NORMAL_BIAS_TEXELS * texelWorld;
  }
  /**
  * Claims a light's shadow slots, fits it, and adds its slots to the view's shadow list; the
  * lighting systems' one entry point, so they never track shadow state
  */
  prepareShadow(light, view3d) {
    const list = view3d._shadowDataList;
    const slots = this._claimShadowSlots(light, view3d, list.count);
    if (slots === 0) return;
    this._growAtlas(list.count + slots);
    this.updateLightShadowData(light, view3d);
    const cascades = this.getShadowGPUData(light).cascades;
    for (let c = 0; c < slots; c++) list.add(cascades[c]);
  }
  /**
  * Claims this frame's slots for a light and sets its `_shadowDataIndex`, or sets -1 and returns 0
  * when it can't cast, nothing casts, or the budget is full
  */
  _claimShadowSlots(light, view3d, claimed) {
    const castsShadow = light.canCastShadow && this._hasCasters(view3d);
    const cascadeCount = cascadeCountFor(light);
    if (castsShadow && claimed + cascadeCount <= MAX_SHADOW_SLOTS) {
      light._shadowDataIndex = claimed;
      return cascadeCount;
    }
    if (castsShadow) warnOnce("pixijs-3d-shadow-budget", WARN_SHADOW_BUDGET);
    light._shadowDataIndex = -1;
    return 0;
  }
  /**
  * Releases the shadow map without unbinding it, since the view tears its global bind group down
  * before it destroys the graph
  */
  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this._view3d = null;
    this._releaseTarget();
    super.destroy();
  }
};
function calculateTransparentDistances(renderables, transformData, cameraPos) {
  const camX = cameraPos.x;
  const camY = cameraPos.y;
  const camZ = cameraPos.z;
  const items = renderables.items;
  const renderableIndices = renderables.renderableIndices;
  const count = renderables.count;
  for (let i = 0; i < count; i++) {
    const renderable = items[renderableIndices[i]];
    const matrixOffset = renderable._storeIndex * 24;
    const dx = transformData[matrixOffset + 12] - camX;
    const dy = transformData[matrixOffset + 13] - camY;
    const dz = transformData[matrixOffset + 14] - camZ;
    renderable._sortKey = -(dx * dx + dy * dy + dz * dz);
  }
  renderables.sortForced((m) => m._sortKey);
}
function calculateDistancesFromWorldMatrix(renderables, cameraPos) {
  const camX = cameraPos.x;
  const camY = cameraPos.y;
  const camZ = cameraPos.z;
  const items = renderables.items;
  const renderableIndices = renderables.renderableIndices;
  const count = renderables.count;
  for (let i = 0; i < count; i++) {
    const renderable = items[renderableIndices[i]];
    const e = renderable.worldTransform.elements;
    const dx = e[12] - camX;
    const dy = e[13] - camY;
    const dz = e[14] - camZ;
    renderable._sortKey = -(dx * dx + dy * dy + dz * dz);
  }
  renderables.sortForced((m) => m._sortKey);
}
function calculateDistancesFromStore(renderables, cameraPos, storeF32, batchMatrix) {
  const camX = cameraPos.x;
  const camY = cameraPos.y;
  const camZ = cameraPos.z;
  const bm = batchMatrix.elements;
  const items = renderables.items;
  const renderableIndices = renderables.renderableIndices;
  const count = renderables.count;
  for (let i = 0; i < count; i++) {
    const renderable = items[renderableIndices[i]];
    const s = renderable._storeIndex * 24;
    const tx = storeF32[s + 12];
    const ty = storeF32[s + 13];
    const tz = storeF32[s + 14];
    const wx = bm[0] * tx + bm[4] * ty + bm[8] * tz + bm[12];
    const wy = bm[1] * tx + bm[5] * ty + bm[9] * tz + bm[13];
    const wz = bm[2] * tx + bm[6] * ty + bm[10] * tz + bm[14];
    const dx = wx - camX;
    const dy = wy - camY;
    const dz = wz - camZ;
    renderable._sortKey = -(dx * dx + dy * dy + dz * dz);
  }
  renderables.sortForced((m) => m._sortKey);
}
const alphaOpaqueBit = {
  name: "alphaOpaque",
  gpu: { fragment: { end: `
  alpha = 1.0;
` } },
  gl: { fragment: { end: `
  alpha = 1.0;
` } }
};
const cameraBit = {
  name: "camera",
  bindings: { camera: {
    uCameraPosition: "vec3<f32>",
    uViewMatrix: "mat4x4<f32>",
    uProjectionMatrix: "mat4x4<f32>",
    uViewProjectionMatrix: "mat4x4<f32>",
    uPreviousViewProjectionMatrix: "mat4x4<f32>",
    uViewportUVScale: "vec2<f32>",
    uLightTileTransform: "vec4<f32>",
    uLightTiles: `array<vec4<i32>, ${LIGHT_TILE_LANES}>`,
    uLightDepthMasks: `array<vec4<i32>, ${LIGHT_DEPTH_LANES}>`,
    uLightDepthPlane: "vec4<f32>"
  } }
};
function helpers(name, color, input, frame) {
  const wgsl = `
fn decodeColor(c: vec3<f32>) -> vec3<f32> { return ${color.replace("VEC3", "vec3<f32>")}; }
fn inputTint(linearTint: vec4<f32>, displayTint: vec4<f32>) -> vec4<f32> { return ${input}Tint; }
fn inputExposure(linearExposure: f32, displayExposure: f32) -> f32 { return ${input}Exposure; }
fn decodeFrame(c: vec3<f32>) -> vec3<f32> { return ${frame.replace("VEC3", "vec3<f32>")}; }
`;
  const glsl = `
vec3 decodeColor(vec3 c) { return ${color.replace("VEC3", "vec3")}; }
vec4 inputTint(vec4 linearTint, vec4 displayTint) { return ${input}Tint; }
float inputExposure(float linearExposure, float displayExposure) { return ${input}Exposure; }
vec3 decodeFrame(vec3 c) { return ${frame.replace("VEC3", "vec3")}; }
`;
  return {
    name,
    gpu: { header: wgsl },
    gl: { header: glsl }
  };
}
const linearColorSpaceBit = helpers("colorSpaceLinear", "pow(c, VEC3(2.2))", "linear", "pow(c, VEC3(2.2))");
const linearFramesColorSpaceBit = helpers("colorSpaceLinearFrames", "pow(c, VEC3(2.2))", "linear", "c");
const displayColorSpaceBit = helpers("colorSpaceDisplay", "c", "display", "c");
function selectColorSpaceBit(material, toneBit, linearInputs) {
  if (!toneBit) return linearFramesColorSpaceBit;
  const encodeOnly = material._skipsToneCurve || toneBit === srgbEncodeBit;
  return material.colorSpace === "display" && !material.lit && encodeOnly && !linearInputs ? displayColorSpaceBit : linearColorSpaceBit;
}
const doubleSidedNormalBit = {
  name: "doubleSidedNormal",
  gpu: { fragment: { material: `
  normal = select(-normal, normal, input.frontFacing);
` } },
  gl: { fragment: { material: `
  if (!gl_FrontFacing) {
    normal = -normal;
  }
` } }
};
const flatShadingBit = {
  name: "flatShading",
  gpu: { fragment: { material: `
  let flatNormal = normalize(cross(dpdx(input.vPosition), dpdy(input.vPosition)));
  normal = select(-flatNormal, flatNormal, dot(flatNormal, normal) >= 0.0);
` } },
  gl: { fragment: { material: `
  vec3 flatNormal = normalize(cross(dFdx(vPosition), dFdy(vPosition)));
  normal = dot(flatNormal, normal) >= 0.0 ? flatNormal : -flatNormal;
` } }
};
const materialBits = /* @__PURE__ */ new Map();
function materialBindingsBit(bits, form) {
  const count = collectTextureNames(bits).length;
  const hasRow = form === "direct" && Object.keys(mergeMaterialStruct(bits)).length > 0;
  const key = `${count}|${form}|${hasRow}`;
  let bit = materialBits.get(key);
  if (bit) return bit;
  const batch = Object.fromEntries(Array.from({ length: count }, (_, t) => t).flatMap((t) => [[`uMaterialTexture${t}`, "texture_2d<f32>"], [`uMaterialSampler${t}`, "sampler"]]));
  if (hasRow) batch.material = "uniform<Material>";
  bit = {
    name: `materialBindings:${count}:${form}${hasRow ? ":material" : ""}`,
    bindings: { batch }
  };
  materialBits.set(key, bit);
  return bit;
}
const NORMAL_GPU = `
  worldNormal = bbRight * normal.x + bbUp * normal.y + bbNormal * normal.z;
`;
const NORMAL_GL = `
  worldNormal = bbRight * normal.x + bbUp * normal.y + bbNormal * normal.z;
`;
function sphericalGpu(lit) {
  return `
  let bbRight = vec3<f32>(camera.uViewMatrix[0][0], camera.uViewMatrix[1][0], camera.uViewMatrix[2][0]);
  let bbUp    = vec3<f32>(camera.uViewMatrix[0][1], camera.uViewMatrix[1][1], camera.uViewMatrix[2][1]);
  let bbNormal = cross(bbRight, bbUp);

  let bbScaleX = length(modelMatrix[0].xyz);
  let bbScaleY = length(modelMatrix[1].xyz);
  let bbScaleZ = length(modelMatrix[2].xyz);

  worldPosition = vec4<f32>(
    modelMatrix[3].xyz
      + bbRight * (position.x * bbScaleX)
      + bbUp * (position.y * bbScaleY)
      + bbNormal * (position.z * bbScaleZ),
    1.0
  );
  clipPosition = camera.uViewProjectionMatrix * worldPosition;
${lit ? NORMAL_GPU : ""}`;
}
function sphericalGl(lit) {
  return `
  vec3 bbRight = vec3(uViewMatrix[0][0], uViewMatrix[1][0], uViewMatrix[2][0]);
  vec3 bbUp    = vec3(uViewMatrix[0][1], uViewMatrix[1][1], uViewMatrix[2][1]);
  vec3 bbNormal = cross(bbRight, bbUp);

  float bbScaleX = length(modelMatrix[0].xyz);
  float bbScaleY = length(modelMatrix[1].xyz);
  float bbScaleZ = length(modelMatrix[2].xyz);

  worldPosition = vec4(
    modelMatrix[3].xyz
      + bbRight * (position.x * bbScaleX)
      + bbUp * (position.y * bbScaleY)
      + bbNormal * (position.z * bbScaleZ),
    1.0
  );
  gl_Position = uViewProjectionMatrix * worldPosition;
${lit ? NORMAL_GL : ""}`;
}
function cylindricalGpu(lit) {
  return `
  let bbColX = modelMatrix[0].xyz;
  let bbColY = modelMatrix[1].xyz;
  let bbScaleX = length(bbColX);
  let bbScaleY = length(bbColY);
  let bbScaleZ = length(modelMatrix[2].xyz);
  let bbCentre = modelMatrix[3].xyz;

  var bbUp = vec3<f32>(0.0, 1.0, 0.0);
  if (bbScaleY > 1e-8) { bbUp = bbColY / bbScaleY; }

  let bbToCam = camera.uCameraPosition - bbCentre;
  let bbFlat = bbToCam - bbUp * dot(bbToCam, bbUp);
  let bbFlatLenSq = dot(bbFlat, bbFlat);

  var bbRight = vec3<f32>(1.0, 0.0, 0.0);
  if (bbFlatLenSq > 1e-8) {
    bbRight = cross(bbUp, bbFlat) * inverseSqrt(bbFlatLenSq);
  } else if (bbScaleX > 1e-8) {
    bbRight = bbColX / bbScaleX;
  }

  let bbNormal = cross(bbRight, bbUp);

  worldPosition = vec4<f32>(
    bbCentre
      + bbRight * (position.x * bbScaleX)
      + bbUp * (position.y * bbScaleY)
      + bbNormal * (position.z * bbScaleZ),
    1.0
  );
  clipPosition = camera.uViewProjectionMatrix * worldPosition;
${lit ? NORMAL_GPU : ""}`;
}
function cylindricalGl(lit) {
  return `
  vec3 bbColX = modelMatrix[0].xyz;
  vec3 bbColY = modelMatrix[1].xyz;
  float bbScaleX = length(bbColX);
  float bbScaleY = length(bbColY);
  float bbScaleZ = length(modelMatrix[2].xyz);
  vec3 bbCentre = modelMatrix[3].xyz;

  vec3 bbUp = vec3(0.0, 1.0, 0.0);
  if (bbScaleY > 1e-8) { bbUp = bbColY / bbScaleY; }

  vec3 bbToCam = uCameraPosition - bbCentre;
  vec3 bbFlat = bbToCam - bbUp * dot(bbToCam, bbUp);
  float bbFlatLenSq = dot(bbFlat, bbFlat);

  vec3 bbRight = vec3(1.0, 0.0, 0.0);
  if (bbFlatLenSq > 1e-8) {
    bbRight = cross(bbUp, bbFlat) * inversesqrt(bbFlatLenSq);
  } else if (bbScaleX > 1e-8) {
    bbRight = bbColX / bbScaleX;
  }

  vec3 bbNormal = cross(bbRight, bbUp);

  worldPosition = vec4(
    bbCentre
      + bbRight * (position.x * bbScaleX)
      + bbUp * (position.y * bbScaleY)
      + bbNormal * (position.z * bbScaleZ),
    1.0
  );
  gl_Position = uViewProjectionMatrix * worldPosition;
${lit ? NORMAL_GL : ""}`;
}
const cache$2 = /* @__PURE__ */ Object.create(null);
function getMeshBillboardBit(mode, lit) {
  const key = `${mode}:${lit}`;
  const existing = cache$2[key];
  if (existing) return existing;
  if (mode === "none") throw new Error("[meshBillboardBits] billboardMode 'none' has no bit — the caller must skip injection.");
  const spherical = mode === "spherical";
  const bit = {
    name: `meshBillboard${spherical ? "Spherical" : "Cylindrical"}${lit ? "Lit" : ""}`,
    gpu: { vertex: { afterTransform: spherical ? sphericalGpu(lit) : cylindricalGpu(lit) } },
    gl: { vertex: { afterTransform: spherical ? sphericalGl(lit) : cylindricalGl(lit) } }
  };
  cache$2[key] = bit;
  return bit;
}
const normalBit = {
  name: "normal",
  attributes: { aNormal: "float32x3" },
  gpu: { vertex: { input: "normal = input.aNormal;" } },
  gl: { vertex: { input: "normal = aNormal;" } }
};
const normalMappingBit = {
  name: "normalMapping",
  requires: [derivativeTangentFrameBit],
  gpu: { fragment: { material: `
  let normalMapSample = sampleNormal(input.vUV).rgb;
  var tangentNormal = normalMapSample * 2.0 - 1.0;
  tangentNormal = vec3<f32>(tangentNormal.xy * material.normalScale, tangentNormal.z);
  let tbnMatrix = calculateTBN(normal, input.vPosition, input.vUV);
  normal = normalize(tbnMatrix * tangentNormal);
` } },
  gl: { fragment: { material: `
  {
  vec3 normalMapSample = sampleNormal(vUV).rgb;
  vec3 tangentNormal = normalMapSample * 2.0 - 1.0;
  tangentNormal.xy *= material.normalScale;
  mat3 tbnMatrix = calculateTBN(normal, vPosition, vUV);
  normal = normalize(tbnMatrix * tangentNormal);
  }
` } }
};
const noShadowBit = {
  name: "no-shadow",
  gpu: { header: `
    fn calculateShadow(
      shadowDataIndex: f32,
      cascadeCount: f32,
      worldPos: vec3<f32>,
      normal: vec3<f32>,
      NdotL: f32
    ) -> f32 {
      return 1.0;
    }
    ` },
  gl: { header: `
    float calculateShadow(
      Light light,
      vec3 worldPos,
      vec3 normal,
      float NdotL
    ) {
      return 1.0;
    }
    ` }
};
const cache$1 = /* @__PURE__ */ Object.create(null);
function getPositionBit(format) {
  const existing = cache$1[format];
  if (existing) return existing;
  if (getAttributeInfoFromFormat(format).size < 3) throw new Error(`[positionBit] aPosition needs three components, got ${format}`);
  const xyz = format === "float32x3" ? "aPosition" : "aPosition.xyz";
  const bit = {
    name: `position:${format}`,
    attributes: { aPosition: format },
    gpu: { vertex: { input: `position = vec4<f32>(vec3<f32>(input.${xyz}), 1.0);` } },
    gl: { vertex: { input: `position = vec4(vec3(${xyz}), 1.0);` } }
  };
  cache$1[format] = bit;
  return bit;
}
const RenderableStruct = {
  transform: "mat4x4<f32>",
  bonePitIndex: "u32",
  materialIndex: "u32",
  geometryDataIndex: "u32",
  visibility: "u32",
  morphWeightIndex: "u32"
};
const GeometryDataStruct = {
  boundsCenter: "vec3<f32>",
  boundsRadius: "f32",
  morphDeltaBase: "u32",
  morphTargetCount: "u32",
  baseVertex: "u32",
  _pad: "u32"
};
const RenderableInstanceStruct = { id: "u32" };
const BoneMatrixStruct = { rows: "mat3x4<f32>" };
const LightStructGpu = {
  position: "vec3<f32>",
  kind: "f32",
  color: "vec3<f32>",
  rangeSq: "f32",
  direction: "vec3<f32>",
  coneCos: "f32",
  innerConeCos: "f32",
  shadowDataIndex: "f32",
  cascadeCount: "f32",
  radiusPow4: "f32"
};
const LightStructGl = {
  position: "vec3<f32>",
  type: "f32",
  color: "vec3<f32>",
  rangeSq: "f32",
  direction: "vec3<f32>",
  coneCos: "f32",
  innerConeCos: "f32",
  shadowDataIndex: "f32",
  radiusPow4: "f32"
};
const ShadowDataStructGl = {
  lightSpaceMatrix: "mat4x4<f32>",
  shadowParams: "vec4<f32>",
  cascadeSplits: "vec4<f32>"
};
const SHADOW_TAPS = {
  hard: [[0, 0]],
  pcf: [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1]
  ],
  "pcf-high": [
    [-2, -2],
    [0, -2],
    [2, -2],
    [-2, 0],
    [0, 0],
    [2, 0],
    [-2, 2],
    [0, 2],
    [2, 2]
  ]
};
const tangentNormalMappingBit = {
  name: "tangentNormalMapping",
  attributes: { aTangent: "float32x4" },
  interStage: {
    vTangent: "vec3<f32>",
    vBitangent: "vec3<f32>"
  },
  gpu: {
    vertex: {
      input: `
    tangent = input.aTangent.xyz;
  `,
      end: `
  let worldTangent = normalize(modelMatrix3 * tangent);
  let worldBitangent = cross(worldNormal, worldTangent) * input.aTangent.w;
  output.vTangent = worldTangent;
  output.vBitangent = worldBitangent;
`
    },
    fragment: { material: `
  let normalMapSample = sampleNormal(input.vUV).rgb;
  var tangentNormal = normalMapSample * 2.0 - 1.0;
  tangentNormal = vec3<f32>(tangentNormal.xy * material.normalScale, tangentNormal.z);
  let tbnMatrix = mat3x3<f32>(
    normalize(input.vTangent),
    normalize(input.vBitangent),
    normal
  );
  normal = normalize(tbnMatrix * tangentNormal);
` }
  },
  gl: {
    vertex: {
      input: `
    tangent = aTangent.xyz;
  `,
      end: `
  vec3 worldTangent = normalize(modelMatrix3 * tangent);
  vec3 worldBitangent = cross(worldNormal, worldTangent) * aTangent.w;
  vTangent = worldTangent;
  vBitangent = worldBitangent;
`
    },
    fragment: { material: `
  vec3 normalMapSample = sampleNormal(vUV).rgb;
  vec3 tangentNormal = normalMapSample * 2.0 - 1.0;
  tangentNormal.xy *= material.normalScale;
  mat3 tbnMatrix = mat3(
    normalize(vTangent),
    normalize(vBitangent),
    normal
  );
  normal = normalize(tbnMatrix * tangentNormal);
` }
  }
};
const cache = /* @__PURE__ */ Object.create(null);
function getUvsBit(format) {
  const existing = cache[format];
  if (existing) return existing;
  const bit = {
    name: `uvs:${format}`,
    overrideDefs: { HAS_UVS: {
      type: "u32",
      required: true
    } },
    attributes: { aUV: format },
    gpu: { vertex: { input: "uv = vec2<f32>(input.aUV);" } },
    gl: { vertex: { input: "uv = vec2(aUV);" } }
  };
  cache[format] = bit;
  return bit;
}
const vertexColorBit = {
  name: "vertexColor",
  attributes: { aColor: "float32x4" },
  interStage: { vColor: "vec4<f32>" },
  gpu: {
    vertex: { end: `output.vColor = input.aColor;` },
    fragment: { material: `albedo *= input.vColor.rgb;
  alpha *= input.vColor.a;` }
  },
  gl: {
    vertex: { end: `vColor = aColor;` },
    fragment: { material: `albedo *= vColor.rgb;
  alpha *= vColor.a;` }
  }
};
function collectSlotCode(bits, platform, stage) {
  const slotCode = {};
  for (const bit of bits) {
    const stageData = bit[platform]?.[stage];
    if (!stageData) continue;
    for (const [slotName, code] of Object.entries(stageData)) {
      if (!code) continue;
      slotCode[slotName] ??= [];
      slotCode[slotName].push(code);
    }
  }
  return slotCode;
}
const SLOT_PATTERN = /\{\{(.*?)\}\}/g;
const MAX_PASSES = 8;
function fillTemplateSlots(templateSource, slotCode) {
  let result = templateSource;
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const next = result.replace(SLOT_PATTERN, (_match, slotName) => {
      const code = slotCode[slotName];
      return code ? code.join("\n") : "";
    });
    if (next === result) break;
    result = next;
  }
  const survivors = result.match(SLOT_PATTERN);
  if (survivors) {
    const names = [...new Set(survivors)].join(", ");
    throw new Error(`[fillTemplateSlots] Slot markers still present after ${MAX_PASSES} substitution passes: ${names}. A slot's code reintroduces its own marker (directly or via another slot) — break the cycle.`);
  }
  return result;
}
const findSlotsRx = /\{\{(.*?)\}\}/g;
function getTemplateSlots(programSrc) {
  const slots = {};
  (programSrc.match(findSlotsRx)?.map((slot) => slot.replace(/[{()}]/g, "")) ?? []).forEach((slot) => {
    slots[slot] = [];
  });
  return slots;
}
const templateSlotCache = /* @__PURE__ */ new Map();
function getCachedTemplateSlots(templateSource) {
  let slots = templateSlotCache.get(templateSource);
  if (!slots) {
    slots = new Set(Object.keys(getTemplateSlots(templateSource)));
    templateSlotCache.set(templateSource, slots);
  }
  return slots;
}
function readsInstanceData(bits) {
  for (let i = 0; i < bits.length; i++) if (bits[i].bindings?.instance) return true;
  return false;
}
function instanceVaryingName(field) {
  return `vInstance_${field}`;
}
const INSTANCE_READ = /\binstance\b(?:\s*\.\s*([A-Za-z]\w*))?/g;
const COMMENT = /\/\/[^\n]*|\/\*[\s\S]*?\*\//g;
function collectStageReads(bits, platform, stage, declared, into) {
  for (const bit of bits) {
    const slots = bit[platform]?.[stage];
    if (!slots) continue;
    for (const slot in slots) {
      const code = slots[slot];
      if (!code) continue;
      for (const match of code.replace(COMMENT, "").matchAll(INSTANCE_READ)) if (match[1] === void 0) for (const name in declared) into.add(name);
      else if (match[1] in declared) into.add(match[1]);
    }
  }
}
function resolveInstanceAccess(bits, platform, layout, template) {
  if (!layout) {
    const reader = bits.find((bit) => bit.bindings?.instance);
    throw new Error(`[instanceData] Bit "${reader?.name}" reads instance data, but the mesh it draws has none. Draw it as a BatchedMesh3D slot and declare the fields in the batch's instanceData option.`);
  }
  const declared = {};
  for (const bit of bits) {
    const fields = bit.bindings?.instance;
    if (!fields) continue;
    for (const { name, spec } of bindingFields(fields, "instance")) {
      const type = bindingType(spec);
      const inBatch = layout.struct[name];
      if (inBatch !== type) throw new Error(`[instanceData] Bit "${bit.name}" reads instance.${name} as ${type}, but the batch ` + (inBatch ? `declares it as ${inBatch}.` : `has no such field. Its instanceData is: ${layout.key}.`));
      declared[name] = inBatch;
    }
  }
  const fragment = /* @__PURE__ */ new Set();
  collectStageReads(bits, platform, "fragment", declared, fragment);
  const loaded = new Set(fragment);
  collectStageReads(bits, platform, "vertex", declared, loaded);
  const access = {
    layout,
    loaded,
    varyings: [...fragment]
  };
  assertInstanceSlots(template, platform, access);
  return access;
}
function assertInstanceSlots(template, platform, access) {
  const fragmentReads = access.varyings.length > 0;
  let missing = null;
  if (platform === "gpu") {
    const source = template.gpu ?? "";
    if (!source.includes("{{vertexStoreAccess}}")) missing = "{{vertexStoreAccess}}";
    else if (fragmentReads && !source.includes("{{fragmentStoreAccess}}")) missing = "{{fragmentStoreAccess}}";
  } else if (!template.gl?.vertex.includes("{{storeAccess}}")) missing = "{{storeAccess}} in its vertex source";
  else if (fragmentReads && !template.gl.fragment.includes("{{storeAccess}}")) missing = "{{storeAccess}} in its fragment source";
  if (missing) throw new Error(`[instanceData] A bit reads instance data, but the shader template has no ${missing}. Add the slot where the draw's store row is in scope, or use the material's own template.`);
}
const materialStructPackPlugin = { preCompile(context) {
  const structs = context.data.structs;
  if (!structs?.Material) return;
  structs.Material = mergeMaterialStruct(context.bits);
} };
function texelScalar(type) {
  if (type.includes("u32")) return "u32";
  if (type.includes("i32")) return "i32";
  return "f32";
}
function layoutStructTexels(fields, read) {
  const layout = createStructLayout(fields);
  const texels = /* @__PURE__ */ new Map();
  for (const elem of layout.elements) {
    if (read && !read.has(elem.name)) continue;
    const wordOffset = elem.offset / 4;
    const texelIndex = Math.floor(wordOffset / 4);
    const componentStart = wordOffset % 4;
    const swizzle = elem.components === 4 ? "" : `.${"xyzw".slice(componentStart, componentStart + elem.components)}`;
    let entries = texels.get(texelIndex);
    if (!entries) texels.set(texelIndex, entries = []);
    entries.push({
      name: elem.name,
      type: elem.type,
      scalar: texelScalar(elem.type),
      swizzle
    });
  }
  return texels;
}
function normalizeDef(bitName, key, def) {
  const anyDef = def;
  if (!anyDef?.type) throw new Error(`[ShaderBit:${bitName}] overrideDefs.${key} missing 'type'.`);
  const hasDefault = Object.prototype.hasOwnProperty.call(anyDef, "default");
  const isRequired = anyDef.required === true;
  if (hasDefault && isRequired) throw new Error(`[ShaderBit:${bitName}] overrideDefs.${key} cannot specify both 'default' and 'required: true'.`);
  if (!hasDefault && !isRequired) throw new Error(`[ShaderBit:${bitName}] overrideDefs.${key} must specify either 'default' or 'required: true'.`);
  if (isRequired) return {
    type: anyDef.type,
    required: true
  };
  if (typeof anyDef.default !== "number" || !Number.isFinite(anyDef.default)) throw new Error(`[ShaderBit:${bitName}] overrideDefs.${key}.default must be a finite number.`);
  return {
    type: anyDef.type,
    default: anyDef.default,
    required: false
  };
}
function collectOverrideDefs(bits) {
  const defs = /* @__PURE__ */ Object.create(null);
  for (const bit of bits) {
    if (!bit.overrideDefs) continue;
    for (const [key, rawDef] of Object.entries(bit.overrideDefs)) {
      const normalized = normalizeDef(bit.name, key, rawDef);
      const existing = defs[key];
      if (existing && (existing.type !== normalized.type || existing.required !== normalized.required || !existing.required && existing.default !== normalized.default)) throw new Error(`[ShaderBit overrides] Duplicate override '${key}' has conflicting definitions.
Existing: ${JSON.stringify(existing)}
New (from '${bit.name}'): ${JSON.stringify(normalized)}`);
      defs[key] = existing ?? normalized;
    }
  }
  return defs;
}
function formatWgslLiteral(type, value) {
  if (type === "u32") return `${Math.trunc(value)}u`;
  if (type === "i32") return `${Math.trunc(value)}`;
  if (Number.isInteger(value)) return `${value}.0`;
  return `${value}`;
}
function emitOverridesWgsl(defs) {
  const lines = [];
  for (const key of Object.keys(defs).sort()) {
    const def = defs[key];
    if (def.required) lines.push(`override ${key}: ${def.type};`);
    else {
      const lit = formatWgslLiteral(def.type, def.default);
      lines.push(`override ${key}: ${def.type} = ${lit};`);
    }
  }
  return lines.length ? lines.join("\n") : "";
}
function formatGlslLiteral(type, value) {
  if (type === "u32") return `${Math.trunc(value)}`;
  if (type === "i32") return `${Math.trunc(value)}`;
  if (Number.isInteger(value)) return `${value}.0`;
  return `${value}`;
}
function emitOverridesGlsl(defs, values) {
  const lines = [];
  for (const key of Object.keys(defs).sort()) {
    const def = defs[key];
    const provided = values[key];
    const hasProvided = provided !== void 0;
    if (def.required && !hasProvided) throw new Error(`[glslOverrides] required override '${key}' has no value supplied via descriptor.overrides.`);
    const value = hasProvided ? provided : def.default;
    lines.push(`#define ${key} ${formatGlslLiteral(def.type, value)}`);
  }
  return lines.length ? lines.join("\n") : "";
}
function compileShader(context, plugins) {
  for (const plugin of plugins) plugin.collectData?.(context);
  for (const plugin of plugins) plugin.preCompile?.(context);
  const slotCode = {};
  for (const plugin of plugins) {
    const injected = plugin.injectCode?.(context);
    if (injected) for (const [slot, code] of Object.entries(injected)) {
      if (!code || !/\S/.test(code)) continue;
      slotCode[slot] ??= [];
      slotCode[slot].push(code);
    }
  }
  return fillTemplateSlots(context.templateString, slotCode);
}
function addWithRequired(bit, resolved, seen) {
  if (seen.has(bit)) return;
  seen.add(bit);
  const requires = bit.requires;
  if (requires) for (let i = 0; i < requires.length; i++) addWithRequired(requires[i], resolved, seen);
  resolved.push(bit);
}
function resolveShaderBits(bits) {
  const resolved = [];
  const seen = /* @__PURE__ */ new Set();
  for (let i = 0; i < bits.length; i++) addWithRequired(bits[i], resolved, seen);
  return resolved;
}
function validateCamera(view3d) {
  const { camera } = view3d;
  if (camera._view3d !== view3d) throw new Error("Camera3D is no longer in the View3D scene graph. Don't remove an assigned camera from its parent without reassigning view3d.camera.");
  if (camera.renderTexture) throw new Error("The View3D's own camera draws the view, not a texture. Put the render texture on a second camera and draw from it with a pass that names that camera.");
  if (!camera.visible || camera._worldVisible === 0) throw new Error("Camera3D is hidden (visible=false or an ancestor is hidden). Cannot render with a hidden camera.");
}
var View3DGCRegistry = class {
  _managedViews;
  constructor(renderer) {
    this._managedViews = new GCManagedHash({
      renderer,
      type: "renderable",
      name: "view3d"
    });
    TexturePool.on("evict", this._releasePooledTextures);
  }
  /** Reads `items` on each call, since pixi's GC sweep replaces the object */
  _releasePooledTextures = () => {
    const views = this._managedViews.items;
    for (const uid2 in views) {
      const view = views[uid2];
      if (view) view._releasePooledTextures();
    }
  };
  /** Enrols the View; does nothing for one already enrolled */
  track(view3d) {
    this._managedViews.add(view3d);
  }
  /** Unloads every enrolled View; the pipe must call it before freeing the stores their draws bind */
  destroy() {
    TexturePool.off("evict", this._releasePooledTextures);
    const views = Object.values(this._managedViews.items);
    for (let i = 0; i < views.length; i++) views[i]?.unload();
    this._managedViews.destroy();
  }
};
const DEFAULT_VERTEX_CAPACITY = 1024;
const DEFAULT_INDEX_CAPACITY = 2048;
var GeometryAtlas = class {
  uid = uid("geometryAtlas");
  attributeKey;
  vertexStride = 0;
  _vertexBuffer;
  _indexBuffer;
  /** Buffers growth replaced, kept until `destroy` because draws recorded earlier in the frame may still read them */
  _retiredBuffers = [];
  /** Kept until `destroy`, like `_retiredBuffers` */
  _retiredGeometries = [];
  _vertexCount = 0;
  _indexCount = 0;
  _deadVertexCount = 0;
  _deadIndexCount = 0;
  /** In offset order, which `defragment`'s in-place slide relies on */
  _liveAllocations = [];
  _vertexDirtyMin = Infinity;
  _vertexDirtyMax = -Infinity;
  _indexDirtyMin = Infinity;
  _indexDirtyMax = -Infinity;
  /**
  * Bumped when growth or a compaction leaves draw commands recorded against the atlas stale
  * @internal
  */
  _bufferVersion = 0;
  geometry;
  _attributeInfo;
  /** Whether `add` bakes `baseVertex` into the index values, for WebGL 2, which has no `baseVertex` draw parameter */
  rebaseIndices;
  constructor(options) {
    const { referenceGeometry, initialVertexCapacity = DEFAULT_VERTEX_CAPACITY, initialIndexCapacity = DEFAULT_INDEX_CAPACITY, rebaseIndices = false } = options;
    this.rebaseIndices = rebaseIndices;
    this.attributeKey = referenceGeometry.attributeKey;
    const attrs = referenceGeometry.attributes;
    const sortedKeys = Object.keys(attrs).sort();
    if (!sortedKeys.some((k) => !attrs[k].instance)) throw new Error("GeometryAtlas: reference geometry has no vertex attributes");
    let computedStride = 0;
    this._attributeInfo = [];
    for (const name of sortedKeys) {
      const srcAttr = attrs[name];
      if (srcAttr.instance) continue;
      const format = srcAttr.format;
      const byteSize = getAttributeInfoFromFormat(format).stride;
      computedStride = alignTo4Bytes(computedStride);
      const offset = computedStride;
      computedStride += byteSize;
      this._attributeInfo.push({
        name,
        format,
        offset,
        byteSize
      });
    }
    this.vertexStride = alignTo4Bytes(computedStride);
    this._vertexBuffer = new Buffer3D({
      data: new Uint8Array(initialVertexCapacity * this.vertexStride),
      usage: BufferUsage.VERTEX | BufferUsage.COPY_DST,
      label: "GeometryAtlas-vertex",
      shrinkToFit: false
    });
    this._indexBuffer = new Buffer3D({
      data: new Uint32Array(initialIndexCapacity),
      usage: BufferUsage.INDEX | BufferUsage.COPY_DST,
      label: "GeometryAtlas-index",
      shrinkToFit: false
    });
    this.geometry = this._buildMergedGeometry();
  }
  /**
  * Copies through `Uint32Array` views, as a float copy alters quantized normals that read as NaN. The
  * word copy is unrolled to four words, the largest vertex format, because that beats an inner loop
  */
  add(geometry) {
    const existing = geometry._geometryAtlasAllocation;
    if (existing && existing.atlas === this) return existing;
    for (const name in geometry.attributes) if (geometry.attributes[name].instance) throw new Error(`GeometryAtlas: Cannot add geometry with instance attribute "${name}". The Atlas is for merging vertex data only; instance data would be lost.`);
    if (geometry.attributeKey !== this.attributeKey) throw new Error(`GeometryAtlas: attribute structure mismatch. Expected "${this.attributeKey}", got "${geometry.attributeKey}"`);
    const vertexCount = geometry.vertexCount;
    const srcIndices = geometry.indexBuffer.data;
    const indexCount = srcIndices.length;
    const vertexCapacity = this._vertexBuffer.data.byteLength / this.vertexStride;
    const indexCapacity = this._indexBuffer.data.length;
    const needsVertexRoom = this._vertexCount + vertexCount > vertexCapacity;
    const needsIndexRoom = this._indexCount + indexCount > indexCapacity;
    if (needsVertexRoom || needsIndexRoom) {
      const liveVertices = this._vertexCount - this._deadVertexCount;
      const liveIndices = this._indexCount - this._deadIndexCount;
      const vertexFits = liveVertices + vertexCount <= vertexCapacity;
      const indexFits = liveIndices + indexCount <= indexCapacity;
      if (vertexFits && indexFits) this.defragment();
      else {
        if (this._deadVertexCount > 0 || this._deadIndexCount > 0) this.defragment();
        this._ensureVertexCapacity(this._vertexCount + vertexCount);
        this._ensureIndexCapacity(this._indexCount + indexCount);
      }
    }
    const baseVertex = this._vertexCount;
    const firstIndex = this._indexCount;
    this._vertexCount += vertexCount;
    this._indexCount += indexCount;
    const vertexData = this._vertexBuffer.data;
    const indexData = this._indexBuffer.data;
    const vertexStride = this.vertexStride;
    const dstByteOffset = baseVertex * vertexStride;
    const byteLength = vertexCount * vertexStride;
    if (this._matchesAtlasLayout(geometry)) {
      const src = geometry.attributes[this._attributeInfo[0].name].buffer.data;
      vertexData.set(new Uint8Array(src.buffer, src.byteOffset, byteLength), dstByteOffset);
    } else {
      const vertexWords = new Uint32Array(vertexData.buffer);
      for (const { name, offset, byteSize } of this._attributeInfo) {
        const attr = geometry.attributes[name];
        const data = attr.buffer.data;
        const srcStride = attr.stride ?? byteSize;
        const srcOffset = attr.offset ?? 0;
        if (((data.byteOffset | srcOffset | srcStride | byteSize) & 3) === 0) {
          const srcWords = new Uint32Array(data.buffer, data.byteOffset, data.byteLength >> 2);
          const srcStep = srcStride >> 2;
          const dstStep = vertexStride >> 2;
          let src = srcOffset >> 2;
          let dst = dstByteOffset + offset >> 2;
          for (let i = 0; i < vertexCount; i++) {
            vertexWords[dst] = srcWords[src];
            if (byteSize > 4) vertexWords[dst + 1] = srcWords[src + 1];
            if (byteSize > 8) vertexWords[dst + 2] = srcWords[src + 2];
            if (byteSize > 12) vertexWords[dst + 3] = srcWords[src + 3];
            src += srcStep;
            dst += dstStep;
          }
        } else {
          const srcBytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
          let src = srcOffset;
          let dst = dstByteOffset + offset;
          for (let i = 0; i < vertexCount; i++) {
            for (let b = 0; b < byteSize; b++) vertexData[dst + b] = srcBytes[src + b];
            src += srcStride;
            dst += vertexStride;
          }
        }
      }
    }
    this._markVertexDirty(dstByteOffset, dstByteOffset + byteLength);
    if (this.rebaseIndices) for (let i = 0; i < indexCount; i++) indexData[firstIndex + i] = srcIndices[i] + baseVertex;
    else indexData.set(srcIndices, firstIndex);
    this._markIndexDirty(firstIndex, firstIndex + indexCount);
    const allocation = {
      atlas: this,
      baseVertex,
      firstIndex,
      indexCount,
      vertexCount
    };
    geometry._geometryAtlasAllocation = allocation;
    geometry._atlasVacated = false;
    this._liveAllocations.push(allocation);
    return allocation;
  }
  /**
  * Doesn't version the atlas, since the range keeps its bytes until a compaction; on a destroyed atlas it only
  * clears the geometry's allocation
  */
  remove(geometry) {
    const alloc = geometry._geometryAtlasAllocation;
    if (!alloc) return;
    geometry._geometryAtlasAllocation = null;
    geometry._atlasVacated = true;
    if (this._vertexBuffer === null) return;
    this._deadVertexCount += alloc.vertexCount;
    this._deadIndexCount += alloc.indexCount;
    const idx = this._liveAllocations.indexOf(alloc);
    if (idx !== -1) this._liveAllocations.splice(idx, 1);
  }
  update() {
    if (this._vertexDirtyMin < this._vertexDirtyMax) {
      const size = this._vertexDirtyMax - this._vertexDirtyMin;
      this._vertexBuffer.update(size, this._vertexDirtyMin);
      this._vertexDirtyMin = Infinity;
      this._vertexDirtyMax = -Infinity;
    }
    if (this._indexDirtyMin < this._indexDirtyMax) {
      const offsetBytes = this._indexDirtyMin * 4;
      const sizeBytes = (this._indexDirtyMax - this._indexDirtyMin) * 4;
      this._indexBuffer.update(sizeBytes, offsetBytes);
      this._indexDirtyMin = Infinity;
      this._indexDirtyMax = -Infinity;
    }
  }
  _matchesAtlasLayout(geometry) {
    const attributes = geometry.attributes;
    const buffer = attributes[this._attributeInfo[0].name].buffer;
    for (const info of this._attributeInfo) {
      const attr = attributes[info.name];
      if (attr.buffer !== buffer || attr.stride !== this.vertexStride || (attr.offset ?? 0) !== info.offset) return false;
    }
    return true;
  }
  _buildMergedGeometry() {
    const geo = new Geometry();
    for (const { name, format, offset } of this._attributeInfo) geo.addAttribute(name, {
      buffer: this._vertexBuffer,
      format,
      stride: this.vertexStride,
      offset
    });
    geo.addIndex(this._indexBuffer);
    return geo;
  }
  _markVertexDirty(startByte, endByte) {
    if (startByte < this._vertexDirtyMin) this._vertexDirtyMin = startByte;
    if (endByte > this._vertexDirtyMax) this._vertexDirtyMax = endByte;
  }
  _markIndexDirty(startIndex, endIndex) {
    if (startIndex < this._indexDirtyMin) this._indexDirtyMin = startIndex;
    if (endIndex > this._indexDirtyMax) this._indexDirtyMax = endIndex;
  }
  _retireCurrentGeometry() {
    if (this.geometry) {
      this.geometry.indexBuffer = null;
      this._retiredGeometries.push(this.geometry);
    }
  }
  _ensureVertexCapacity(requiredVertices) {
    const oldData = this._vertexBuffer.data;
    let capacity = oldData.byteLength / this.vertexStride;
    if (requiredVertices <= capacity) return;
    while (capacity < requiredVertices) capacity *= 2;
    const newData = new Uint8Array(capacity * this.vertexStride);
    newData.set(oldData);
    this._retiredBuffers.push(this._vertexBuffer);
    this._vertexBuffer = new Buffer3D({
      data: newData,
      usage: BufferUsage.VERTEX | BufferUsage.COPY_DST,
      label: "GeometryAtlas-vertex",
      shrinkToFit: false
    });
    this._markVertexDirty(0, this._vertexCount * this.vertexStride);
    this._retireCurrentGeometry();
    this.geometry = this._buildMergedGeometry();
    this._bufferVersion++;
  }
  _ensureIndexCapacity(requiredIndices) {
    const oldData = this._indexBuffer.data;
    let capacity = oldData.length;
    if (requiredIndices <= capacity) return;
    while (capacity < requiredIndices) capacity *= 2;
    const newData = new Uint32Array(capacity);
    newData.set(oldData);
    this._retiredBuffers.push(this._indexBuffer);
    this._indexBuffer = new Buffer3D({
      data: newData,
      usage: BufferUsage.INDEX | BufferUsage.COPY_DST,
      label: "GeometryAtlas-index",
      shrinkToFit: false
    });
    this._markIndexDirty(0, this._indexCount);
    this._retireCurrentGeometry();
    this.geometry = this._buildMergedGeometry();
    this._bufferVersion++;
  }
  /**
  * Destroys the merged geometries without their buffers, which they share, then each buffer once. Packed
  * geometries keep their allocations here, so `add` into another atlas copies them in afresh
  */
  destroy() {
    if (this._vertexBuffer === null) return;
    if (this.geometry) this.geometry.indexBuffer = null;
    this.geometry?.destroy(false);
    this.geometry = null;
    this._vertexBuffer.destroy();
    this._indexBuffer.destroy();
    for (let i = 0; i < this._retiredGeometries.length; i++) this._retiredGeometries[i].destroy(false);
    this._retiredGeometries = null;
    for (let i = 0; i < this._retiredBuffers.length; i++) this._retiredBuffers[i].destroy();
    this._retiredBuffers = null;
    this._vertexBuffer = null;
    this._indexBuffer = null;
    this._liveAllocations = null;
  }
  /**
  * Updates live allocations in place, and bumps `_bufferVersion` even for dead space only at the tail, which
  * the next `add` overwrites while recorded commands may still read it
  */
  defragment() {
    if (this._deadVertexCount === 0 && this._deadIndexCount === 0) return;
    const stride = this.vertexStride;
    const vertexData = this._vertexBuffer.data;
    const indexData = this._indexBuffer.data;
    let writeVertex = 0;
    let writeIndex = 0;
    const rebase = this.rebaseIndices;
    for (const alloc of this._liveAllocations) {
      const oldBaseVertex = alloc.baseVertex;
      if (oldBaseVertex !== writeVertex) {
        const srcByte = oldBaseVertex * stride;
        const dstByte = writeVertex * stride;
        const byteLen = alloc.vertexCount * stride;
        vertexData.copyWithin(dstByte, srcByte, srcByte + byteLen);
        alloc.baseVertex = writeVertex;
      }
      writeVertex += alloc.vertexCount;
      if (alloc.firstIndex !== writeIndex) {
        indexData.copyWithin(writeIndex, alloc.firstIndex, alloc.firstIndex + alloc.indexCount);
        alloc.firstIndex = writeIndex;
      }
      if (rebase && oldBaseVertex !== alloc.baseVertex) {
        const delta = alloc.baseVertex - oldBaseVertex;
        for (let i = 0; i < alloc.indexCount; i++) indexData[alloc.firstIndex + i] += delta;
      }
      writeIndex += alloc.indexCount;
    }
    this._markVertexDirty(0, writeVertex * stride);
    this._markIndexDirty(0, writeIndex);
    this._vertexCount = writeVertex;
    this._indexCount = writeIndex;
    this._deadVertexCount = 0;
    this._deadIndexCount = 0;
    this._bufferVersion++;
  }
};
const sharedPools = /* @__PURE__ */ Object.create(null);
var GeometryAtlasPool = class GeometryAtlasPool2 {
  _atlases = /* @__PURE__ */ Object.create(null);
  _rebaseIndices;
  _bufferVersion = 0;
  constructor(options) {
    this._rebaseIndices = options.rebaseIndices;
  }
  /**
  * Shared by every renderer with the same `rebaseIndices`, since a geometry holds one allocation that two
  * pools would each re-cut. No renderer destroys it; pixi's `GlobalResourceRegistry` clears it on
  * `renderer.destroy(true)`
  * @returns The shared pool
  */
  static from(options) {
    const key = options.rebaseIndices ? "rebased" : "geometryLocal";
    let pool = sharedPools[key];
    if (!pool) {
      pool = new GeometryAtlasPool2(options);
      sharedPools[key] = pool;
      GlobalResourceRegistry.register(pool);
    }
    return pool;
  }
  /** Bumped when an `allocate` grows or compacts an atlas; a removal never bumps it */
  get bufferVersion() {
    return this._bufferVersion;
  }
  /**
  * Reuses the geometry's allocation only when it's in this pool's atlas; one left in a destroyed or another
  * pool's atlas is copied in afresh
  */
  allocate(geometry) {
    const key = geometry.attributeKey;
    let atlas = this._atlases[key];
    const existing = geometry._geometryAtlasAllocation;
    if (existing && existing.atlas === atlas) return existing;
    if (!atlas) {
      atlas = new GeometryAtlas({
        referenceGeometry: geometry,
        rebaseIndices: this._rebaseIndices
      });
      this._atlases[key] = atlas;
    }
    const atlasVersion = atlas._bufferVersion;
    const allocation = atlas.add(geometry);
    if (atlas._bufferVersion !== atlasVersion) this._bufferVersion++;
    return allocation;
  }
  /** Uploads what this frame's `allocate` calls wrote, so call it after them and before drawing */
  update() {
    for (const key in this._atlases) this._atlases[key].update();
  }
  /** Destroys every atlas, leaving the pool usable; named for pixi's `Cleanable`, which the registry calls */
  clear() {
    for (const key in this._atlases) this._atlases[key].destroy();
    this._atlases = /* @__PURE__ */ Object.create(null);
  }
};
const TEMP_PARENT_3D = /* @__PURE__ */ (() => {
  const p = new Container3D();
  p._worldVisible = 1;
  return p;
})();
function updateView3DTransforms(view3d) {
  const childrenToUpdate = view3d._childrenToUpdate;
  const updateTick = view3d._updateTick++;
  for (const j in childrenToUpdate) {
    const renderGroupDepth = Number(j);
    const childrenAtDepth = childrenToUpdate[j];
    const list = childrenAtDepth.list;
    const index = childrenAtDepth.index;
    for (let i = 0; i < index; i++) {
      const child = list[i];
      if (child._view3d === view3d && child._relativeSceneDepth === renderGroupDepth) updateTransformAndChildren3D(child, child.parent ?? TEMP_PARENT_3D, updateTick, false, false);
    }
    clearList(list, index);
    childrenAtDepth.index = 0;
  }
}
function updateTransformAndChildren3D(container, parent, updateTick, transformDirty, visibleDirty) {
  if (updateTick === container._updateTick) return;
  container._updateTick = updateTick;
  container.didChange = false;
  transformDirty ||= container._worldTransformDirty;
  visibleDirty ||= container._worldVisibleDirty;
  if (visibleDirty) {
    container._worldVisible = parent._worldVisible * container._visible;
    container._storeWorldVisible();
  }
  if (container._worldVisible && transformDirty) {
    if (container._localTransformDirty) {
      container.updateLocalTransform();
      container._localTransformDirty = false;
    }
    Matrix4.multiplyAffine(container.worldTransform.elements, 0, parent.worldTransform.elements, 0, container.localTransform.elements, 0);
    container._worldTransformId++;
    container._storeWorldTransform();
  }
  container._worldVisibleDirty = false;
  container._worldTransformDirty = container._worldVisible ? false : transformDirty;
  const children = container.children;
  const length = children.length;
  for (let i = 0; i < length; i++) updateTransformAndChildren3D(children[i], container, updateTick, transformDirty, visibleDirty);
}
function updateView3DScene(view3d, pipe, session) {
  updateView3DTransforms(view3d);
  validateCamera(view3d);
  prepareCamera(view3d.camera, session);
  const frame = getCameraData(view3d.camera).frame;
  if (frame.width <= 0 || frame.height <= 0) return false;
  view3d._syncShadowSampling();
  refillBonePit(view3d);
  pipe._morphStoreBuffer.sync(view3d._morphedMeshes.items);
  updateSceneBatch(view3d, pipe);
  updateUserBatches(view3d, pipe);
  restampMorphedGeometry(view3d, pipe);
  invalidateGrownStores(view3d);
  const batches = view3d._meshBatches;
  for (let b = 0; b < batches.length; b++) batches[b].applyEdits();
  return true;
}
function refillBonePit(view3d) {
  view3d._bonePit.clear();
  const skinnedMeshes = view3d._skinnedMeshes.items;
  for (let i = 0; i < view3d._skinnedMeshes.items.length; i++) {
    const mesh = skinnedMeshes[i];
    const skeleton = mesh.skeleton;
    skeleton.updateWorld();
    const base = view3d._bonePit.add(skeleton);
    if (mesh._lastBonePitIndex !== base) {
      mesh._lastBonePitIndex = base;
      mesh._markStoreDirty();
    }
  }
  view3d._bonePit.update();
}
function updateSceneBatch(view3d, pipe) {
  const geomStore = pipe.geometryDataStoreBuffer;
  const queue = view3d._renderablesToUpdate;
  const queued = queue.list;
  const queuedCount = queue.index;
  for (let i = 0; i < queuedCount; i++) {
    const renderable = queued[i];
    renderable.didRenderableUpdate = false;
    if (renderable._view3d !== view3d) continue;
    const material = renderable.material;
    const membershipMask = renderable.renderPassMask;
    if (membershipMask !== renderable._lastRenderPass) view3d._sceneBatch.setPassesAt(view3d._meshSlots.getIndex(renderable), membershipMask);
    let rebuildsLists = false;
    if (renderable._lastDescriptorDirtyId !== material._descriptorDirtyId) {
      rebuildsLists = renderable._lastDescriptorDirtyId !== -1;
      renderable._lastDescriptorDirtyId = material._descriptorDirtyId;
      renderable._batchDirty = true;
    }
    if (renderable._lastRenderPass === 0) continue;
    const geometry = renderable.geometry;
    const unpacked = geometry._geometryAtlasAllocation === null && !geometry.dynamic;
    if (renderable._batchDirty || unpacked) {
      renderable._batchDirty = false;
      rebuildsLists ||= unpacked && geometry._atlasVacated;
      pipe.renderer.material3d.ensureMaterial(renderable, view3d._sceneBatch, view3d);
      if (!geometry.dynamic) geometry._geometryAtlasAllocation = pipe.atlasPool.allocate(geometry);
      geomStore.set(geometry);
      let bits = renderable.renderPassMask & view3d._dirtyHookBits;
      while (bits) {
        const bit = bits & -bits;
        view3d.passByBit[bit].onRenderableDirty(renderable, view3d._sceneBatch, rebuildsLists);
        bits ^= bit;
      }
    }
    if (renderable._storeDirty) {
      renderable._storeDirty = false;
      view3d._sceneBatch.storeBuffer.set(renderable);
    }
  }
  const requeued = queue.index - queuedCount;
  for (let i = 0; i < requeued; i++) queued[i] = queued[queuedCount + i];
  clearList(queued, requeued);
  queue.index = requeued;
  view3d._sceneBatch.storeBuffer.update();
}
function updateUserBatches(view3d, pipe) {
  const geomStore = pipe.geometryDataStoreBuffer;
  for (let b = 1; b < view3d._meshBatches.length; b++) {
    const batch = view3d._meshBatches[b];
    batch.writeBatchWorldMatrix(batch.renderData.worldTransform);
    const dirtyIndices = batch._dirtyIndices;
    const dirtyCount = batch._dirtyCount;
    for (let d = 0; d < dirtyCount; d++) {
      const item = batch.items[dirtyIndices[d]];
      item._batchDirty = false;
      const passes = item._lastRenderPass;
      if (passes === 0) continue;
      const material = item.material;
      let rebuildsLists = item.geometry._geometryAtlasAllocation === null && !item.geometry.dynamic && item.geometry._atlasVacated;
      if (item._lastDescriptorDirtyId !== material._descriptorDirtyId) {
        rebuildsLists ||= item._lastDescriptorDirtyId !== -1;
        item._lastDescriptorDirtyId = material._descriptorDirtyId;
      }
      pipe.renderer.material3d.ensureMaterial(item, batch, view3d);
      if (!item.geometry.dynamic) item.geometry._geometryAtlasAllocation = pipe.atlasPool.allocate(item.geometry);
      geomStore.set(item.geometry);
      batch.storeBuffer.u32Data[item._storeIndex * 24 + 17] = material._materialIndex;
      batch.storeBuffer.u32Data[item._storeIndex * 24 + 18] = item.geometry._geometryDataIndex;
      batch.storeBuffer.markDirty(item._storeIndex);
      let bits = passes & view3d._dirtyHookBits;
      while (bits) {
        const bit = bits & -bits;
        view3d.passByBit[bit].onRenderableDirty(item, batch, rebuildsLists);
        bits ^= bit;
      }
    }
    batch._dirtyCount = 0;
    batch.storeBuffer.update();
    batch.instanceStoreBuffer?.update();
  }
}
function restampMorphedGeometry(view3d, pipe) {
  const geomStore = pipe.geometryDataStoreBuffer;
  const atlasBufferVersion = pipe.atlasPool.bufferVersion;
  if (view3d._lastAtlasBufferVersion !== atlasBufferVersion) {
    view3d._lastAtlasBufferVersion = atlasBufferVersion;
    const morphedMeshes = view3d._morphedMeshes.items;
    for (let i = 0; i < morphedMeshes.length; i++) geomStore.set(morphedMeshes[i].geometry);
  }
}
function invalidateGrownStores(view3d) {
  for (let b = 0; b < view3d._meshBatches.length; b++) {
    const batch = view3d._meshBatches[b];
    const storeVersion = batch.storeBuffer.bufferVersion;
    if (batch._lastStoreBufferVersion !== storeVersion) {
      batch._lastStoreBufferVersion = storeVersion;
      batch.invalidateDrawCaches();
    }
  }
  const boneVersion = view3d._bonePit.bufferVersion;
  if (view3d._lastBonePitBufferVersion !== boneVersion) {
    view3d._lastBonePitBufferVersion = boneVersion;
    view3d._invalidateDrawCaches();
  }
}
var View3DGlobalData = class {
  globalUniformGroup;
  globalBindGroup;
  globalTextureBindings;
  /** Last-seen `bufferVersion` of each shared store; `-1` makes the first render rebuild the draw caches */
  lastMaterialStoreBufferVersion = -1;
  /** Separate from `View3D._lastAtlasBufferVersion` on purpose; that field says why */
  lastAtlasBufferVersion = -1;
  lastMorphStoreBufferVersion = -1;
  lastGeometryStoreBufferVersion = -1;
  _destroyed = false;
  constructor(globalUniformGroup, globalBindGroup, globalTextureBindings) {
    this.globalUniformGroup = globalUniformGroup;
    this.globalBindGroup = globalBindGroup;
    this.globalTextureBindings = globalTextureBindings;
  }
  /** Destroys the bind group before the buffer it binds */
  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this.globalBindGroup.destroy();
    this.globalUniformGroup.buffer?.destroy();
  }
};
export {
  calculateDistancesFromStore as $,
  noShadowBit as A,
  BoneMatrixStruct as B,
  CASCADE_BLEND_FRACTION as C,
  normalBit as D,
  transformFrustumToBatch as E,
  cpuSubmissionLimit as F,
  GeometryDataStruct as G,
  resolveCullProducer as H,
  ShadowRenderPassBase as I,
  calculateTransparentDistances as J,
  GeometryDataStoreBuffer as K,
  LightStructGpu as L,
  MorphStoreBuffer as M,
  GeometryAtlasPool as N,
  View3DGCRegistry as O,
  MaterialDataStoreBuffer as P,
  cachesDrawWork as Q,
  RenderableInstanceStruct as R,
  SHADOW_TAPS as S,
  ColorOutputDraw as T,
  generateBrdfLut as U,
  View3DGlobalData as V,
  updateView3DScene as W,
  detectSharedCacheInvalidation as X,
  ShadowDataStructGl as Y,
  LightStructGl as Z,
  emitOverridesGlsl as _,
  RenderableStruct as a,
  calculateDistancesFromWorldMatrix as a0,
  resolveInstanceAccess as b,
  createGlobalUniformGroup as c,
  collectOverrideDefs as d,
  emitOverridesWgsl as e,
  collectSlotCode as f,
  getCachedTemplateSlots as g,
  resolveShaderBits as h,
  instanceVaryingName as i,
  compileShader as j,
  cameraBit as k,
  layoutStructTexels as l,
  materialBindingsBit as m,
  getPositionBit as n,
  materialStructPackPlugin as o,
  getUvsBit as p,
  doubleSidedNormalBit as q,
  readsInstanceData as r,
  selectColorSpaceBit as s,
  flatShadingBit as t,
  tangentNormalMappingBit as u,
  normalMappingBit as v,
  vertexColorBit as w,
  getMeshBillboardBit as x,
  alphaOpaqueBit as y,
  displayColorSpaceBit as z
};
