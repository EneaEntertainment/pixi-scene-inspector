import { a4 as pipelineState, a5 as BufferResource, a6 as Buffer3D, q as BufferUsage, w as warn, E as ExtensionType, K as TextureStyle, a7 as BindGroup, a8 as UINT_EMPTY, T as Texture, a9 as DEPTH_VIEW_PLACEHOLDER, aa as DEPTH_EMPTY, ab as CUBETEXTURE_EMPTY, ac as MAX_SHADOW_SLOTS, ad as RenderPassBit, ae as CubeTexture, af as writeHemisphere, ag as addLinearRgb, ah as capitalize$1, ai as resolveBindGroups, aj as bindingFields, ak as bindingType, al as RESOURCE_TYPES, am as isStorageType, an as parseStorageType, ao as isUniformBufferType, ap as parseUniformBufferType, aq as collectFragmentOutputs, ar as DEFAULT_OUTPUT_LOCATIONS, as as extractStructAndGroups, at as generateGpuLayoutGroups, au as bindingVisibility, av as ShaderStage, aw as wgslTexelAddress, ax as ShaderOverrides, ay as assertBindGroups, S as Shader, az as assertBitIdentity, aA as getMaterialLayout, aB as validateMaterialTextureSlots, aC as validateMaterialStruct, aD as MeshPassCache, aE as NORMAL_MAP, aF as anisotropyTangentVariant, aG as srgbEncodeBit, aH as decodeToLinearBit, aI as addPassMaterialBits, aJ as ShaderDescriptor, aK as collectTextureNames, aL as getCameraData, e as GlobalResourceRegistry, aM as stateFor3D, aN as castsShadowThisFrame, aO as cascadeCountFor, aP as CullResults, R as Rectangle, aQ as fullscreenTriangleGeometry, a as State, aR as generateIblSpecialCubemap, C as Color, aS as writeLinearRgb, l as extensions } from "./index-BlFurYJo.js";
import { L as LightStructGpu, G as GeometryDataStruct, B as BoneMatrixStruct, R as RenderableInstanceStruct, a as RenderableStruct, c as createGlobalUniformGroup, V as View3DGlobalData, S as SHADOW_TAPS, C as CASCADE_BLEND_FRACTION, l as layoutStructTexels, r as readsInstanceData, b as resolveInstanceAccess, i as instanceVaryingName, g as getCachedTemplateSlots, e as emitOverridesWgsl, d as collectOverrideDefs, f as collectSlotCode, h as resolveShaderBits, j as compileShader, m as materialBindingsBit, k as cameraBit, n as getPositionBit, o as materialStructPackPlugin, s as selectColorSpaceBit, p as getUvsBit, q as doubleSidedNormalBit, t as flatShadingBit, u as tangentNormalMappingBit, v as normalMappingBit, w as vertexColorBit, x as getMeshBillboardBit, y as alphaOpaqueBit, z as displayColorSpaceBit, A as noShadowBit, D as normalBit, E as transformFrustumToBatch, F as cpuSubmissionLimit, H as resolveCullProducer, I as ShadowRenderPassBase, J as calculateTransparentDistances, M as MorphStoreBuffer, K as GeometryDataStoreBuffer, N as GeometryAtlasPool, O as View3DGCRegistry, P as MaterialDataStoreBuffer, Q as cachesDrawWork, T as ColorOutputDraw, U as generateBrdfLut, W as updateView3DScene, X as detectSharedCacheInvalidation } from "./View3DGlobalData-BrNBNgbY.js";
import "./isSafari-B31r88pP.js";
import "./RenderTexture-BCDvCICf.js";
const noAlloc = {
  atlas: null,
  indexCount: void 0,
  firstIndex: void 0,
  baseVertex: void 0
};
var Mesh3DBatcher = class {
  _materialSystem;
  constructor(materialSystem) {
    this._materialSystem = materialSystem;
  }
  /**
  * Rebuilds `commandList` from the sorted renderables
  *
  * Each later material of a direct run refreshes its own bind group, since the capture at a run's
  * start refreshes only the first material's.
  */
  render(options) {
    const { renderables, globalBindGroup, commandList, drawData, passBit, bindsMaterial, batch, view3d } = options;
    const len = renderables.count;
    if (len === 0) return;
    commandList.clear();
    const indices = renderables.indices;
    const items = renderables.items;
    const materialSystem = this._materialSystem;
    let r = items[indices[0]];
    let cache = r._passCache[passBit];
    let currentAlloc = r.geometry._geometryAtlasAllocation || noAlloc;
    let currentBatchKey = cache.batchKey;
    let currentGeometry = currentAlloc.atlas ? currentAlloc.atlas.geometry : r.geometry;
    let currentShader = cache.shader;
    let currentState = pipelineState(currentBatchKey, cache.state);
    let currentTopology = cache.topology;
    let currentMaterial = r.material;
    let batchStart = 0;
    let runStart = 0;
    let runCommandStart = 0;
    let runFirstMaterial = currentMaterial;
    let merged = false;
    if (bindsMaterial) commandList.captureMaterialTextures(currentMaterial);
    for (let i = 1; i < len; i++) {
      r = items[indices[i]];
      cache = r._passCache[passBit];
      const rBatchKey = cache.batchKey;
      const m = r.material;
      const keyChanged = rBatchKey !== currentBatchKey;
      if (!keyChanged && (!bindsMaterial || m === currentMaterial)) continue;
      const sameRun = !keyChanged && currentMaterial._textureSetId === m._textureSetId;
      if (sameRun) {
        if (merged) {
          currentMaterial = m;
          continue;
        }
        if (commandList.count - runCommandStart + 2 > 16) {
          commandList.count = runCommandStart;
          batchStart = runStart;
          merged = true;
          currentShader = materialSystem.ensureMergedShader(items[indices[runStart]], batch, view3d);
          currentMaterial = m;
          continue;
        }
      }
      const cmd = commandList.next();
      cmd.geometry = currentGeometry;
      cmd.shader = currentShader;
      cmd.globalBindGroup = globalBindGroup;
      cmd.batchBindGroup = bindsMaterial ? merged ? runFirstMaterial._getMergedBindGroup() : currentMaterial._getBindGroup() : void 0;
      cmd.state = currentState;
      cmd.topology = currentTopology;
      cmd.batchKey = currentBatchKey;
      cmd.textureSetId = bindsMaterial ? runFirstMaterial._textureSetId : 0;
      cmd.merged = bindsMaterial && merged;
      commandList.captureGeometry(currentGeometry);
      const offset = (commandList.count - 1) * 5;
      const drawCalls = drawData.ensureCapacity(commandList.count);
      drawCalls[offset] = currentAlloc.indexCount ?? (currentGeometry.indexCount || currentGeometry.indexBuffer.data.length);
      drawCalls[offset + 1] = i - batchStart;
      drawCalls[offset + 2] = currentAlloc.firstIndex || 0;
      drawCalls[offset + 3] = currentAlloc.baseVertex || 0;
      drawCalls[offset + 4] = batchStart;
      batchStart = i;
      const materialChanged = m !== currentMaterial;
      currentMaterial = m;
      if (!sameRun) {
        if (keyChanged) {
          currentAlloc = r.geometry._geometryAtlasAllocation || noAlloc;
          currentBatchKey = rBatchKey;
          currentGeometry = currentAlloc.atlas ? currentAlloc.atlas.geometry : r.geometry;
          currentState = pipelineState(rBatchKey, cache.state);
          currentTopology = cache.topology;
        }
        currentShader = cache.shader;
        runStart = i;
        runCommandStart = commandList.count;
        runFirstMaterial = m;
        merged = false;
      }
      if (bindsMaterial && materialChanged) {
        if (sameRun) commandList.refreshMaterialBindings(m);
        else commandList.captureMaterialTextures(m);
      }
    }
    {
      const cmd = commandList.next();
      cmd.geometry = currentGeometry;
      cmd.shader = currentShader;
      cmd.globalBindGroup = globalBindGroup;
      cmd.batchBindGroup = bindsMaterial ? merged ? runFirstMaterial._getMergedBindGroup() : currentMaterial._getBindGroup() : void 0;
      cmd.state = currentState;
      cmd.topology = currentTopology;
      cmd.batchKey = currentBatchKey;
      cmd.textureSetId = bindsMaterial ? runFirstMaterial._textureSetId : 0;
      cmd.merged = bindsMaterial && merged;
      commandList.captureGeometry(currentGeometry);
      const offset = (commandList.count - 1) * 5;
      const drawCalls = drawData.ensureCapacity(commandList.count);
      drawCalls[offset] = currentAlloc.indexCount ?? (currentGeometry.indexCount || currentGeometry.indexBuffer.data.length);
      drawCalls[offset + 1] = len - batchStart;
      drawCalls[offset + 2] = currentAlloc.firstIndex || 0;
      drawCalls[offset + 3] = currentAlloc.baseVertex || 0;
      drawCalls[offset + 4] = batchStart;
    }
    commandList.endBuild();
  }
};
const EMPTY_BUFFER_RESOURCE = new BufferResource({ buffer: new Buffer3D({
  data: /* @__PURE__ */ new Int32Array(1),
  usage: BufferUsage.STORAGE | BufferUsage.COPY_DST | BufferUsage.COPY_SRC,
  label: "EmptyBufferResource",
  shrinkToFit: false
}) });
function warnAttributeConflict(name, newFormat, existingFormat) {
  warn(`[collectAttributes] Attribute "${name}" redefined with different format: "${existingFormat}" → "${newFormat}". Keeping original.`);
}
function collectAttributes(bits) {
  const attributes = /* @__PURE__ */ Object.create(null);
  for (const bit of bits) {
    if (!bit.attributes) continue;
    for (const [name, format] of Object.entries(bit.attributes)) if (!(name in attributes)) attributes[name] = format;
    else if (attributes[name] !== format) warnAttributeConflict(name, format, attributes[name]);
  }
  return attributes;
}
const DRAW_ARGS_STRUCT = `
struct DrawArgs {
  indexCount: u32,
  instanceCount: atomic<u32>,
  firstIndex: u32,
  baseVertex: u32,
  firstInstance: u32,
};
`;
const ZERO_WGSL = `
${DRAW_ARGS_STRUCT}
@group(0) @binding(0) var<storage, read_write> drawCalls: array<DrawArgs>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let k = gid.x;
  if (k >= arrayLength(&drawCalls)) { return; }
  atomicStore(&drawCalls[k].instanceCount, 0u);
}
`;
const COMPACT_WGSL = `
${DRAW_ARGS_STRUCT}
struct Frustum { planes: array<vec4<f32>, 6> };

@group(0) @binding(0) var<storage, read>       srcInstances: array<u32>;
@group(0) @binding(1) var<storage, read_write> dstInstances: array<u32>;
@group(0) @binding(2) var<storage, read_write> drawCalls:    array<DrawArgs>;
@group(0) @binding(3) var<storage, read>       store:        array<u32>;
@group(0) @binding(4) var<storage, read>       geomBounds:   array<vec4<f32>>;
@group(0) @binding(5) var<uniform>             frustum:      Frustum;

const STRIDE: u32 = 24u;
const GEOM_LANE: u32 = 18u;
const VIS_LANE: u32 = 19u;
const NO_BOUNDS: u32 = 0xffffffffu;

fn loadMatrix(base: u32) -> mat4x4<f32> {
  return mat4x4<f32>(
    bitcast<f32>(store[base + 0u]),  bitcast<f32>(store[base + 1u]),  bitcast<f32>(store[base + 2u]),  bitcast<f32>(store[base + 3u]),
    bitcast<f32>(store[base + 4u]),  bitcast<f32>(store[base + 5u]),  bitcast<f32>(store[base + 6u]),  bitcast<f32>(store[base + 7u]),
    bitcast<f32>(store[base + 8u]),  bitcast<f32>(store[base + 9u]),  bitcast<f32>(store[base + 10u]), bitcast<f32>(store[base + 11u]),
    bitcast<f32>(store[base + 12u]), bitcast<f32>(store[base + 13u]), bitcast<f32>(store[base + 14u]), bitcast<f32>(store[base + 15u]),
  );
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  let instanceCount = arrayLength(&srcInstances);
  if (i >= instanceCount) { return; }

  let id = srcInstances[i];
  if (store[id * STRIDE + VIS_LANE] == 0u) { return; }

  var lo = 0u;
  var hi = arrayLength(&drawCalls) - 1u;
  while (lo < hi) {
    let mid = (lo + hi + 1u) >> 1u;
    if (drawCalls[mid].firstInstance <= i) { lo = mid; } else { hi = mid - 1u; }
  }

  let boundsSlot = store[id * STRIDE + GEOM_LANE];
  if (boundsSlot != NO_BOUNDS) {
    let sphere = geomBounds[boundsSlot * 2u];
    if (sphere.w >= 0.0) {
      let local = loadMatrix(id * STRIDE);
      let center = local * vec4<f32>(sphere.xyz, 1.0);
      let sx = dot(local[0].xyz, local[0].xyz);
      let sy = dot(local[1].xyz, local[1].xyz);
      let sz = dot(local[2].xyz, local[2].xyz);
      let radius = sphere.w * sqrt(max(sx, max(sy, sz)));
      for (var p = 0u; p < 6u; p = p + 1u) {
        let plane = frustum.planes[p];
        if (dot(plane.xyz, center.xyz) + plane.w < -radius) { return; }
      }
    }
  }

  let slot = atomicAdd(&drawCalls[lo].instanceCount, 1u);
  dstInstances[drawCalls[lo].firstInstance + slot] = id;
}
`;
var ComputeSystemGpu = class {
  /** @ignore */
  static extension = {
    type: [ExtensionType.WebGPUSystem],
    name: "compute3d"
  };
  _renderer;
  _zeroPipeline = null;
  _compactPipeline = null;
  _zeroBinds = /* @__PURE__ */ new WeakMap();
  _compactBinds = /* @__PURE__ */ new WeakMap();
  /** Reused every frame, since `dispatch` runs per batch per frame and must not allocate */
  _jobs = [];
  _jobCount = 0;
  _destroyed = false;
  constructor(renderer) {
    this._renderer = renderer;
  }
  /** Resets the jobs in case a throw skipped the last `renderEnd` */
  renderStart() {
    this._jobCount = 0;
  }
  /**
  * Only records the job, since `renderEnd` must encode every zero before any compact; copies `planes`,
  * which callers reuse as scratch
  * @param drawCalls - The result's indirect args, 5 `u32` per command
  * @param src - The list's instance records, one store index each
  * @param dst - Receives the survivors
  * @param store - The batch's store
  * @param bounds - The per-geometry store
  * @param planes - The 24 frustum plane floats, in the batch's frame
  * @param commandCount - Commands in `drawCalls`
  * @param instanceCount - Records in `src`
  */
  dispatch(drawCalls, src, dst, store, bounds, planes, commandCount, instanceCount) {
    if (commandCount === 0 || instanceCount === 0) return;
    let job = this._jobs[this._jobCount];
    if (!job) {
      const paramsF32 = /* @__PURE__ */ new Float32Array(24);
      job = this._jobs[this._jobCount] = {
        drawCalls: null,
        src: null,
        dst: null,
        store: null,
        bounds: null,
        params: new Buffer3D({
          data: paramsF32,
          usage: BufferUsage.UNIFORM | BufferUsage.COPY_DST,
          label: "mesh3d_cull_frustum",
          shrinkToFit: false
        }),
        paramsF32,
        commandCount: 0,
        instanceCount: 0
      };
    }
    job.drawCalls = drawCalls;
    job.src = src;
    job.dst = dst;
    job.store = store;
    job.bounds = bounds;
    job.paramsF32.set(planes);
    job.params.update();
    job.commandCount = commandCount;
    job.instanceCount = instanceCount;
    this._jobCount++;
  }
  /**
  * Drops each job's batch buffers after the submit, so a pooled slot pins no destroyed batch; `params`
  * is the slot's own and stays
  */
  renderEnd() {
    const jobCount = this._jobCount;
    this._jobCount = 0;
    if (jobCount === 0) return;
    const device = this._renderer.gpu.device;
    const bufferSys = this._renderer.buffer;
    const zeroPipeline = this._zeroPipeline || this._buildPipeline(device, ZERO_WGSL, "_zeroPipeline");
    const compactPipeline = this._compactPipeline || this._buildPipeline(device, COMPACT_WGSL, "_compactPipeline");
    const encoder = device.createCommandEncoder();
    const jobs = this._jobs;
    const zeroPass = encoder.beginComputePass();
    zeroPass.setPipeline(zeroPipeline);
    for (let i = 0; i < jobCount; i++) {
      const job = jobs[i];
      const drawCalls = bufferSys.getGPUBuffer(job.drawCalls);
      zeroPass.setBindGroup(0, this._zeroBindGroup(device, zeroPipeline, drawCalls, job.commandCount));
      zeroPass.dispatchWorkgroups(Math.ceil(job.commandCount / 64));
    }
    zeroPass.end();
    const compactPass = encoder.beginComputePass();
    compactPass.setPipeline(compactPipeline);
    for (let i = 0; i < jobCount; i++) {
      const job = jobs[i];
      compactPass.setBindGroup(0, this._compactBindGroup(device, compactPipeline, job, bufferSys));
      compactPass.dispatchWorkgroups(Math.ceil(job.instanceCount / 64));
    }
    compactPass.end();
    device.queue.submit([encoder.finish()]);
    for (let i = 0; i < jobCount; i++) {
      jobs[i].drawCalls = null;
      jobs[i].src = null;
      jobs[i].dst = null;
      jobs[i].store = null;
      jobs[i].bounds = null;
    }
  }
  /** Binds `drawCalls` tight, since the kernel reads the command count from `arrayLength` */
  _zeroBindGroup(device, pipeline, drawCalls, commandCount) {
    const cached = this._zeroBinds.get(drawCalls);
    if (cached && cached.commandCount === commandCount) return cached.bindGroup;
    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [{
        binding: 0,
        resource: {
          buffer: drawCalls,
          offset: 0,
          size: commandCount * 20
        }
      }]
    });
    this._zeroBinds.set(drawCalls, {
      bindGroup,
      commandCount
    });
    return bindGroup;
  }
  /** Binds `src`, `dst` and `drawCalls` tight, since the kernel reads its counts from `arrayLength` */
  _compactBindGroup(device, pipeline, job, bufferSys) {
    const src = bufferSys.getGPUBuffer(job.src);
    const dst = bufferSys.getGPUBuffer(job.dst);
    const drawCalls = bufferSys.getGPUBuffer(job.drawCalls);
    const store = bufferSys.getGPUBuffer(job.store);
    const bounds = bufferSys.getGPUBuffer(job.bounds);
    const params = bufferSys.getGPUBuffer(job.params);
    const cached = this._compactBinds.get(drawCalls);
    if (cached && cached.src === src && cached.dst === dst && cached.drawCalls === drawCalls && cached.store === store && cached.bounds === bounds && cached.params === params && cached.commandCount === job.commandCount && cached.instanceCount === job.instanceCount) return cached.bindGroup;
    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: {
            buffer: src,
            offset: 0,
            size: job.instanceCount * 4
          }
        },
        {
          binding: 1,
          resource: {
            buffer: dst,
            offset: 0,
            size: job.instanceCount * 4
          }
        },
        {
          binding: 2,
          resource: {
            buffer: drawCalls,
            offset: 0,
            size: job.commandCount * 20
          }
        },
        {
          binding: 3,
          resource: { buffer: store }
        },
        {
          binding: 4,
          resource: { buffer: bounds }
        },
        {
          binding: 5,
          resource: { buffer: params }
        }
      ]
    });
    this._compactBinds.set(drawCalls, {
      bindGroup,
      src,
      dst,
      drawCalls,
      store,
      bounds,
      params,
      commandCount: job.commandCount,
      instanceCount: job.instanceCount
    });
    return bindGroup;
  }
  _buildPipeline(device, code, field) {
    const module = device.createShaderModule({ code });
    const pipeline = device.createComputePipeline({
      layout: "auto",
      compute: {
        module,
        entryPoint: "main"
      }
    });
    this[field] = pipeline;
    return pipeline;
  }
  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    for (const job of this._jobs) job.params?.destroy();
    this._jobs = null;
    this._zeroPipeline = null;
    this._compactPipeline = null;
    this._zeroBinds = /* @__PURE__ */ new WeakMap();
    this._compactBinds = /* @__PURE__ */ new WeakMap();
    this._jobCount = 0;
  }
};
const globalBitGpu = {
  name: "global",
  structs: {
    Renderable: RenderableStruct,
    RenderableInstance: RenderableInstanceStruct,
    BoneMatrix: BoneMatrixStruct,
    GeometryData: GeometryDataStruct,
    Light: LightStructGpu
  },
  bindings: { global: {
    /** Ambient in `xyz`; `w` holds the light count, which no shader reads */
    uGlobalLightParams: "vec4<f32>",
    uTime: "f32",
    /** Premultiplied by `uExposure`, since the fog bits run after the template applies exposure */
    uFogColor: "vec3<f32>",
    /** `uExposure` raised to `1 / 2.2`, for shaders that run in display space */
    uDisplayExposure: "f32",
    /** `(near, far, density)` */
    uFogParams: "vec3<f32>",
    uExposure: "f32",
    /**
    * Sky colour; it and the next two members are written only under a `Hemisphere` environment, the
    * only one whose bits read them
    */
    uHemisphereSky: "vec3<f32>",
    uHemisphereGround: "vec3<f32>",
    uHemisphereUp: "vec3<f32>",
    /** Four `vec4` per light, as `LightDataList` lays them out */
    uLightData: `array<vec4<f32>, 128>`,
    uShadowData: `array<vec4<f32>, ${MAX_SHADOW_SLOTS * 6}>`,
    uSampler: "sampler",
    uEnvironmentTexture: "texture_cube<f32>",
    uBrdfLutTexture: "texture_2d<f32>",
    uBrdfLutSampler: "sampler",
    uShadowMap: "texture_depth_2d_array",
    uShadowSampler: "sampler_comparison",
    uOpaqueDepthTexture: "texture_depth_2d",
    uOpaqueColorTexture: "texture_2d<f32>",
    /** `u32` texels, so `getMaterial` reads exact bits */
    uMaterialStorage: "texture_2d<u32>",
    uRenderableStorage: {
      type: `storage<Renderable>`,
      visibility: "vertex"
    },
    uRenderableInstanceStorage: {
      type: `storage<RenderableInstance>`,
      visibility: "vertex"
    },
    uBonePitStorage: {
      type: `storage<BoneMatrix>`,
      visibility: "vertex"
    },
    uMorphStorage: {
      type: `storage<f32>`,
      visibility: "vertex"
    },
    uGeometryStorage: {
      type: `storage<GeometryData>`,
      visibility: "vertex"
    }
  } },
  /** The `Light.kind` values, as `LightDataList` writes them */
  gpu: { header: `
const LIGHT_DIRECTIONAL: f32 = 0.0;
const LIGHT_POINT: f32 = 1.0;
const LIGHT_SPOT: f32 = 2.0;
` }
};
function getGlobalGpuData(view3d, renderer) {
  let data = view3d._gpuData[renderer.uid];
  if (!data) {
    const globalUniformGroup = createGlobalUniformGroup(view3d._lightDataList.data, view3d._shadowDataList.data);
    renderer.ubo.ensureUniformGroup(globalUniformGroup);
    globalUniformGroup.buffer.autoGarbageCollect = false;
    const style = new TextureStyle();
    style.addressMode = "repeat";
    const shadowStyle = new TextureStyle();
    shadowStyle.compare = "less";
    const brdfLutStyle = new TextureStyle();
    brdfLutStyle.addressMode = "clamp-to-edge";
    const group = new BindGroup({
      global: globalUniformGroup,
      uSampler: style,
      uEnvironmentTexture: CUBETEXTURE_EMPTY.source,
      uBrdfLutTexture: Texture.EMPTY.source,
      uBrdfLutSampler: brdfLutStyle,
      uShadowMap: DEPTH_EMPTY.source,
      uShadowSampler: shadowStyle,
      uOpaqueDepthTexture: DEPTH_VIEW_PLACEHOLDER,
      uOpaqueColorTexture: Texture.EMPTY.source,
      uMaterialStorage: UINT_EMPTY.source,
      uRenderableStorage: EMPTY_BUFFER_RESOURCE,
      uRenderableInstanceStorage: EMPTY_BUFFER_RESOURCE,
      uBonePitStorage: view3d._bonePit.bufferResource,
      uMorphStorage: EMPTY_BUFFER_RESOURCE,
      uGeometryStorage: EMPTY_BUFFER_RESOURCE,
      uInstanceStorage: EMPTY_BUFFER_RESOURCE
    });
    data = new View3DGlobalData(globalUniformGroup, group, {
      opaqueColor: {
        group,
        slot: "uOpaqueColorTexture"
      },
      opaqueDepth: {
        group,
        slot: "uOpaqueDepthTexture"
      },
      shadowMap: {
        group,
        slot: "uShadowMap"
      }
    });
    view3d._gpuData[renderer.uid] = data;
  }
  return data;
}
var LightingSystemGpu = class {
  /** @ignore */
  static extension = {
    type: [ExtensionType.WebGPUSystem],
    name: "lighting3d"
  };
  _renderer;
  constructor(renderer) {
    this._renderer = renderer;
  }
  /** Calls the shadow pass's `beginFrame` first, every frame, even when the pass is culled */
  update(view3d, lights) {
    const shadowPass = view3d.passByBit[RenderPassBit.SHADOW];
    shadowPass?.beginFrame(view3d);
    const { _lightDataList: lightDataList, environment } = view3d;
    lightDataList.reset();
    const globalUniforms = getGlobalGpuData(view3d, this._renderer).globalUniformGroup.uniforms;
    const globalLightParams = globalUniforms.uGlobalLightParams;
    globalLightParams[0] = 0;
    globalLightParams[1] = 0;
    globalLightParams[2] = 0;
    if (environment !== null && !(environment instanceof CubeTexture)) writeHemisphere(environment, globalUniforms.uHemisphereSky, globalUniforms.uHemisphereGround, globalUniforms.uHemisphereUp);
    for (let i = 0; i < lights.length; i++) {
      const light = lights[i];
      if (!light._worldVisible) continue;
      if (light.type === "ambient") {
        const al = light;
        const color = al.color;
        const intensity = al.intensity;
        addLinearRgb(globalLightParams, 0, color, intensity);
        continue;
      }
      if (lightDataList.count >= 32) continue;
      shadowPass?.prepareShadow(light, view3d);
      lightDataList.add(light);
    }
    globalLightParams[3] = lightDataList.count;
  }
};
const MIP_DOWNSAMPLE_WGSL = `
  var<private> pos: array<vec2<f32>, 3> = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0), vec2<f32>(-1.0, 3.0), vec2<f32>(3.0, -1.0));

  struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) texCoord: vec2<f32>,
  };

  @vertex
  fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var output: VertexOutput;
    output.texCoord = pos[vertexIndex] * vec2<f32>(0.5, -0.5) + vec2<f32>(0.5);
    output.position = vec4<f32>(pos[vertexIndex], 0.0, 1.0);
    return output;
  }

  @group(0) @binding(0) var imgSampler: sampler;
  @group(0) @binding(1) var img: texture_2d<f32>;

  @fragment
  fn fragmentMain(@location(0) texCoord: vec2<f32>) -> @location(0) vec4<f32> {
    return textureSample(img, imgSampler, texCoord);
  }
`;
var MipChainSystemGpu = class {
  /** @ignore */
  static extension = {
    type: [ExtensionType.WebGPUSystem],
    name: "mipChain3d"
  };
  _renderer;
  _shaderModule = null;
  _sampler = null;
  _pipelines = /* @__PURE__ */ Object.create(null);
  _cache = /* @__PURE__ */ Object.create(null);
  constructor(renderer) {
    this._renderer = renderer;
  }
  generate(source) {
    if (source.mipLevelCount <= 1) return;
    const device = this._renderer.gpu.device;
    const encoder = this._renderer.encoder.commandEncoder;
    const pipeline = this._pipeline(device, source.format);
    const { bindGroups, dstViews } = this._cache[source.uid] || this._buildCacheEntry(source);
    for (let i = 0; i < dstViews.length; i++) {
      const pass = encoder.beginRenderPass({ colorAttachments: [{
        view: dstViews[i],
        loadOp: "clear",
        storeOp: "store",
        clearValue: {
          r: 0,
          g: 0,
          b: 0,
          a: 0
        }
      }] });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroups[i]);
      pass.draw(3);
      pass.end();
    }
  }
  _buildCacheEntry(source) {
    const device = this._renderer.gpu.device;
    const pipeline = this._pipeline(device, source.format);
    const gpuTexture = this._renderer.texture.getGpuSource(source);
    const bindGroups = [];
    const dstViews = [];
    const layout = pipeline.getBindGroupLayout(0);
    for (let mip = 1; mip < source.mipLevelCount; mip++) {
      dstViews.push(gpuTexture.createView({
        baseMipLevel: mip,
        mipLevelCount: 1,
        dimension: "2d"
      }));
      bindGroups.push(device.createBindGroup({
        layout,
        entries: [{
          binding: 0,
          resource: this._sampler
        }, {
          binding: 1,
          resource: gpuTexture.createView({
            baseMipLevel: mip - 1,
            mipLevelCount: 1,
            dimension: "2d"
          })
        }]
      }));
    }
    const entry = {
      bindGroups,
      dstViews
    };
    this._cache[source.uid] = entry;
    return entry;
  }
  _pipeline(device, format) {
    const cached = this._pipelines[format];
    if (cached) return cached;
    this._shaderModule ||= device.createShaderModule({ code: MIP_DOWNSAMPLE_WGSL });
    this._sampler ||= device.createSampler({ minFilter: "linear" });
    const pipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module: this._shaderModule,
        entryPoint: "vertexMain"
      },
      fragment: {
        module: this._shaderModule,
        entryPoint: "fragmentMain",
        targets: [{ format }]
      }
    });
    this._pipelines[format] = pipeline;
    return pipeline;
  }
  /** The cached WebGPU objects have no `destroy()`, so dropping them is their release */
  destroy() {
    this._shaderModule = null;
    this._sampler = null;
    this._pipelines = /* @__PURE__ */ Object.create(null);
    this._cache = /* @__PURE__ */ Object.create(null);
  }
};
function createMorphTargetBitGpu(hasNormals) {
  const stride = hasNormals ? 8 : 4;
  return {
    name: hasNormals ? "morphTargetNormal" : "morphTarget",
    structs: { GeometryData: GeometryDataStruct },
    bindings: { global: {
      uMorphStorage: "storage<f32>",
      uGeometryStorage: "storage<GeometryData>"
    } },
    gpu: { vertex: { input: `
        if (renderable.morphWeightIndex != 0u) {
          let geometryData = uGeometryStorage[renderable.geometryDataIndex];
          let vidLocal = vid - geometryData.baseVertex;
          let morphDeltaBase = geometryData.morphDeltaBase + vidLocal * geometryData.morphTargetCount * ${stride}u;
          var morphedPosition = position.xyz;${hasNormals ? "\n          var morphedNormal = normal;" : ""}
          for (var morphIndex = 0u; morphIndex < geometryData.morphTargetCount; morphIndex = morphIndex + 1u) {
            let weight = uMorphStorage[renderable.morphWeightIndex + morphIndex];
            if (weight != 0.0) {
              let deltaOffset = morphDeltaBase + morphIndex * ${stride}u;
              morphedPosition += vec3<f32>(
                uMorphStorage[deltaOffset],
                uMorphStorage[deltaOffset + 1u],
                uMorphStorage[deltaOffset + 2u],
              ) * weight;${hasNormals ? `
              morphedNormal += vec3<f32>(
                uMorphStorage[deltaOffset + 4u],
                uMorphStorage[deltaOffset + 5u],
                uMorphStorage[deltaOffset + 6u],
              ) * weight;` : ""}
            }
          }
          position = vec4<f32>(morphedPosition, position.w);${hasNormals ? "\n          normal = normalize(morphedNormal);" : ""}
        }
      ` } }
  };
}
const morphTargetBitGpu = createMorphTargetBitGpu(false);
const morphTargetNormalBitGpu = createMorphTargetBitGpu(true);
function fmt(n) {
  return Number.isInteger(n) ? `${n}.0` : `${n}`;
}
function pcfBody(taps) {
  const spread = taps.some(([x, y]) => x !== 0 || y !== 0);
  const lines = [];
  if (spread) lines.push("      let texel = 1.0 / sp.z;");
  taps.forEach(([x, y], i) => {
    const coord = x === 0 && y === 0 ? "uv" : `uv + vec2<f32>(${fmt(x)}, ${fmt(y)}) * texel`;
    lines.push(`      ${i === 0 ? "var s = " : "s += "}textureSampleCompareLevel(uShadowMap, uShadowSampler, ${coord}, idx, d);`);
  });
  lines.push(taps.length === 1 ? "      return s;" : `      return s / ${fmt(taps.length)};`);
  return lines.join("\n");
}
function createShadowBitGpu(filter) {
  return {
    name: `shadow:${filter}`,
    bindings: { global: {
      uShadowMap: "texture_depth_2d_array",
      uShadowSampler: "sampler_comparison",
      uShadowData: `array<vec4<f32>, ${MAX_SHADOW_SLOTS * 6}>`
    } },
    gpu: { header: `
    fn sampleShadowAtIndex(
      idx: i32,
      worldPos: vec3<f32>,
      normal: vec3<f32>,
      NdotL: f32,
    ) -> f32 {
      let slot = idx * 6;
      let lightSpaceMatrix = mat4x4<f32>(
        global.uShadowData[slot],
        global.uShadowData[slot + 1],
        global.uShadowData[slot + 2],
        global.uShadowData[slot + 3],
      );
      let sp = global.uShadowData[slot + 4];

      let biasedPos = worldPos + normal * (sp.y * (1.0 - NdotL));
      let lsp = lightSpaceMatrix * vec4<f32>(biasedPos, 1.0);
      let proj = lsp.xyz / lsp.w;

      let uv = proj.xy * vec2<f32>(0.5, -0.5) + vec2<f32>(0.5);

      if (any(uv < vec2<f32>(0.0)) || any(uv > vec2<f32>(1.0)) || proj.z < 0.0 || proj.z > 1.0) {
        return 1.0;
      }

      let d = proj.z - sp.x;

${pcfBody(SHADOW_TAPS[filter])}
    }

    fn calculateShadow(
      shadowDataIndex: f32,
      cascadeCount: f32,
      worldPos: vec3<f32>,
      normal: vec3<f32>,
      NdotL: f32
    ) -> f32 {
      let baseIndex = i32(shadowDataIndex);

      if (baseIndex == -1) {
        return 1.0;
      }

      let last = i32(cascadeCount) - 1;

      if (last < 1) {
        return sampleShadowAtIndex(baseIndex, worldPos, normal, NdotL);
      }

      let viewDepth = -(camera.uViewMatrix * vec4<f32>(worldPos, 1.0)).z;
      let splits = global.uShadowData[baseIndex * 6 + 5].xyz;

      let crossed = step(splits, vec3<f32>(viewDepth));
      let cascadeIndex = i32(min(dot(crossed, vec3<f32>(1.0)), f32(last)));

      let shadow = sampleShadowAtIndex(baseIndex + cascadeIndex, worldPos, normal, NdotL);

      if (cascadeIndex == last) {
        return shadow;
      }

      let hot = vec3<f32>(f32(cascadeIndex == 0), f32(cascadeIndex == 1), f32(cascadeIndex == 2));
      let splitFar = dot(splits, hot);
      let splitNear = dot(splits, vec3<f32>(hot.y, hot.z, 0.0));

      let band = max((splitFar - splitNear) * ${fmt(CASCADE_BLEND_FRACTION)}, 1e-4);
      let blend = saturate((viewDepth - splitFar + band) / band);

      if (blend <= 0.0) {
        return shadow;
      }

      let next = sampleShadowAtIndex(baseIndex + cascadeIndex + 1, worldPos, normal, NdotL);

      return mix(shadow, next, blend);
    }
  ` }
  };
}
const shadowBitsGpu = {
  hard: createShadowBitGpu("hard"),
  pcf: createShadowBitGpu("pcf"),
  "pcf-high": createShadowBitGpu("pcf-high")
};
const skinningBitGpu = {
  name: "skinning",
  attributes: {
    aJoints: "uint8x4",
    aWeights: "float32x4"
  },
  structs: { BoneMatrix: BoneMatrixStruct },
  bindings: { global: { uBonePitStorage: "storage<BoneMatrix>" } },
  gpu: { vertex: {
    header: `
        fn getBoneRows(idx: u32, bonePitIndex: u32) -> mat3x4<f32> {
            return uBonePitStorage[(bonePitIndex) + idx].rows;
        }
      `,
    input: `
        var skinRows =
            getBoneRows(input.aJoints.x, renderable.bonePitIndex) * input.aWeights.x +
            getBoneRows(input.aJoints.y, renderable.bonePitIndex) * input.aWeights.y +
            getBoneRows(input.aJoints.z, renderable.bonePitIndex) * input.aWeights.z +
            getBoneRows(input.aJoints.w, renderable.bonePitIndex) * input.aWeights.w;

        position = vec4<f32>(dot(skinRows[0], position), dot(skinRows[1], position), dot(skinRows[2], position), position.w);
        normal = vec3<f32>(dot(skinRows[0].xyz, normal), dot(skinRows[1].xyz, normal), dot(skinRows[2].xyz, normal));
        tangent = vec3<f32>(dot(skinRows[0].xyz, tangent), dot(skinRows[1].xyz, tangent), dot(skinRows[2].xyz, tangent));
      `
  } }
};
function wgslFieldValue(entry, texel) {
  if (entry.type === "mat2x2<f32>") return `mat2x2<f32>(bitcast<vec2<f32>>(${texel}.xy), bitcast<vec2<f32>>(${texel}.zw))`;
  const bits = `${texel}${entry.swizzle}`;
  return entry.scalar === "u32" ? bits : `bitcast<${entry.type}>(${bits})`;
}
function generateWgslStructAccessor(options) {
  const lines = [];
  lines.push(`fn ${options.name}(index: u32) -> ${options.struct} {`);
  lines.push(`  let base = ${options.base};`);
  lines.push(`  var m: ${options.struct};`);
  for (const [texelIdx, entries] of layoutStructTexels(options.fields, options.read)) {
    lines.push(`  let t${texelIdx} = ${options.load(`base + ${texelIdx}`)};`);
    for (const entry of entries) lines.push(`  m.${entry.name} = ${wgslFieldValue(entry, `t${texelIdx}`)};`);
  }
  lines.push(`  return m;`);
  lines.push(`}`);
  return lines.join("\n");
}
function createInstanceAccessBitGpu(access) {
  const { layout, loaded, varyings } = access;
  const interStage = {};
  const vertex = ["let instance = getInstance(inst.id);"];
  const fragment = ["var instance: Instance;"];
  for (const name of varyings) {
    const type = layout.struct[name];
    const varying = instanceVaryingName(name);
    const asBits = type === "vec4<u32>" ? `instance.${name}` : `bitcast<vec4<u32>>(instance.${name})`;
    const fromBits = type === "vec4<u32>" ? `input.${varying}` : `bitcast<${type}>(input.${varying})`;
    interStage[varying] = "vec4<u32>";
    vertex.push(`output.${varying} = ${asBits};`);
    fragment.push(`instance.${name} = ${fromBits};`);
  }
  return {
    name: `instanceAccess:${layout.key}`,
    interStage,
    bindings: { global: { uInstanceStorage: {
      type: "storage<vec4<u32>>",
      visibility: "vertex"
    } } },
    gpu: {
      vertex: {
        header: generateWgslStructAccessor({
          name: "getInstance",
          struct: "Instance",
          fields: layout.struct,
          read: loaded,
          base: `index * ${layout.stride / 4}u`,
          load: (texel) => `uInstanceStorage[${texel}]`
        }),
        storeAccess: vertex.join("\n  ")
      },
      fragment: varyings.length ? { storeAccess: fragment.join("\n  ") } : void 0
    }
  };
}
const instanceAccessPlugin = { collectData(context) {
  if (!readsInstanceData(context.bits)) return;
  const access = resolveInstanceAccess(context.bits, "gpu", context.instanceLayout, context.template);
  context.bits = [...context.bits, createInstanceAccessBitGpu(access)];
} };
const FORMAT_TO_WGSL = {
  float32: "f32",
  float32x2: "vec2<f32>",
  float32x3: "vec3<f32>",
  float32x4: "vec4<f32>",
  sint32: "i32",
  sint32x2: "vec2<i32>",
  sint32x3: "vec3<i32>",
  sint32x4: "vec4<i32>",
  uint32: "u32",
  uint32x2: "vec2<u32>",
  uint32x3: "vec3<u32>",
  uint32x4: "vec4<u32>",
  float16x2: "vec2<f32>",
  float16x4: "vec4<f32>",
  unorm8x2: "vec2<f32>",
  unorm8x4: "vec4<f32>",
  snorm8x2: "vec2<f32>",
  snorm8x4: "vec4<f32>",
  uint8x2: "vec2<u32>",
  uint8x4: "vec4<u32>",
  sint8x2: "vec2<i32>",
  sint8x4: "vec4<i32>",
  unorm16x2: "vec2<f32>",
  unorm16x4: "vec4<f32>",
  snorm16x2: "vec2<f32>",
  snorm16x4: "vec4<f32>",
  uint16x2: "vec2<u32>",
  uint16x4: "vec4<u32>",
  sint16x2: "vec2<i32>",
  sint16x4: "vec4<i32>"
};
function toWgslType(format) {
  const mapped = FORMAT_TO_WGSL[format];
  if (!mapped) {
    warn(`[compileAttributesWgsl] Unknown vertex format: "${format}"`);
    return "vec4<f32>";
  }
  return mapped;
}
function emitAttributesWgsl(attributes) {
  const names = Object.keys(attributes);
  if (names.length === 0) return "";
  const out = [];
  out.push("struct VertexInput {");
  let locationIndex = 0;
  for (const name of names) {
    const wgslType = toWgslType(attributes[name]);
    out.push(`  @location(${locationIndex++}) ${name}: ${wgslType},`);
  }
  out.push("}");
  return out.join("\n");
}
const wgslAttributesPlugin = {
  collectData(context) {
    context.data.attributes = collectAttributes(context.bits);
  },
  injectCode(context) {
    return { header: emitAttributesWgsl(context.data.attributes) };
  }
};
function createBindGroupData(groupIndex) {
  return {
    groupIndex,
    bindingIndex: 0,
    resources: /* @__PURE__ */ Object.create(null),
    storages: /* @__PURE__ */ Object.create(null),
    uniformBuffers: /* @__PURE__ */ Object.create(null),
    uniformGroups: /* @__PURE__ */ Object.create(null)
  };
}
function warnBindingConflict(name, newType, existingType) {
  warn(`[collectBindings] Binding "${name}" redefined with different type: "${existingType}" → "${newType}". Keeping original.`);
}
function warnInvalidStorageType(bitName, bindingName, type) {
  warn(`[collectBindings] Bit "${bitName}" binding "${bindingName}" has invalid storage type: "${type}". Expected format: storage<StructName>`);
}
function warnInvalidUniformBufferType(bitName, bindingName, type) {
  warn(`[collectBindings] Bit "${bitName}" binding "${bindingName}" has invalid uniform buffer type: "${type}". Expected format: uniform<StructName>`);
}
function collectBindings(bits, template2) {
  const bindGroups = /* @__PURE__ */ Object.create(null);
  resolveBindGroups(template2).forEach(({ name }, index) => {
    bindGroups[name] = createBindGroupData(index);
  });
  const structs = /* @__PURE__ */ Object.create(null);
  for (const bit of bits) {
    if (!bit.structs) continue;
    for (const [structName, structDef] of Object.entries(bit.structs)) if (!(structName in structs)) structs[structName] = structDef;
  }
  for (const bit of bits) {
    if (!bit.bindings) continue;
    for (const [groupName, bindings] of Object.entries(bit.bindings)) {
      if (!bindings) continue;
      const isBound = groupName in bindGroups;
      for (const { name, spec, uniformGroup: fieldGroup } of bindingFields(bindings, groupName)) {
        const type = bindingType(spec);
        if (RESOURCE_TYPES.has(type)) {
          if (isBound) {
            const res = bindGroups[groupName].resources;
            if (!(name in res)) res[name] = type;
            else if (res[name] !== type) warnBindingConflict(name, type, res[name]);
          }
        } else if (isStorageType(type)) {
          if (isBound) {
            const storageStructName = parseStorageType(type);
            if (!storageStructName) {
              warnInvalidStorageType(bit.name, name, type);
              continue;
            }
            const sto = bindGroups[groupName].storages;
            if (!(name in sto)) sto[name] = storageStructName;
          }
        } else if (isUniformBufferType(type)) {
          if (isBound) {
            const structName = parseUniformBufferType(type);
            if (!structName) {
              warnInvalidUniformBufferType(bit.name, name, type);
              continue;
            }
            const buffers = bindGroups[groupName].uniformBuffers;
            if (!(name in buffers)) {
              buffers[name] = structName;
              structs[structName] ??= {};
            } else if (buffers[name] !== structName) warnBindingConflict(name, structName, buffers[name]);
          }
        } else {
          const uniformGroup = isBound ? fieldGroup : groupName;
          const structName = capitalize$1(uniformGroup);
          if (!(structName in structs)) structs[structName] = {};
          const structDef = structs[structName];
          if (structDef[name] && structDef[name] !== type) warnBindingConflict(name, type, structDef[name]);
          else structDef[name] = type;
          if (isBound) bindGroups[groupName].uniformGroups[uniformGroup] = true;
        }
      }
    }
  }
  return {
    structs,
    bindGroups
  };
}
function buildWgslBindingMap(collected) {
  const { bindGroups } = collected;
  const map = /* @__PURE__ */ Object.create(null);
  for (const groupName in bindGroups) {
    const group = bindGroups[groupName];
    const entries = [];
    let binding = group.bindingIndex;
    if (group.uniformGroups[groupName]) entries.push({
      name: groupName,
      binding: binding++,
      kind: "uniform",
      type: capitalize$1(groupName)
    });
    for (const name in group.resources) entries.push({
      name,
      binding: binding++,
      kind: "resource",
      type: group.resources[name]
    });
    for (const name in group.storages) entries.push({
      name,
      binding: binding++,
      kind: "storage",
      type: group.storages[name]
    });
    for (const name in group.uniformBuffers) entries.push({
      name,
      binding: binding++,
      kind: "uniform",
      type: group.uniformBuffers[name]
    });
    for (const name in group.uniformGroups) if (name !== groupName) entries.push({
      name,
      binding: binding++,
      kind: "uniform",
      type: capitalize$1(name)
    });
    map[groupName] = {
      groupIndex: group.groupIndex,
      entries
    };
  }
  return map;
}
function emitBindingsWgsl(collected) {
  const { structs, bindGroups } = collected;
  for (const groupName in bindGroups) {
    const { uniformBuffers } = bindGroups[groupName];
    for (const name in uniformBuffers) {
      const structName = uniformBuffers[name];
      if (Object.keys(structs[structName] ?? {}).length === 0) throw new Error(`[emitBindingsWgsl] Binding "${name}" is "uniform<${structName}>", but no bit declares fields for a "${structName}" struct.`);
    }
  }
  const out = [];
  for (const structName in structs) {
    const structDef = structs[structName];
    out.push(`struct ${structName} {`);
    for (const [fieldName, fieldType] of Object.entries(structDef)) out.push(`  ${fieldName}: ${fieldType},`);
    out.push("}");
  }
  const map = buildWgslBindingMap(collected);
  for (const groupName in map) {
    const { groupIndex, entries } = map[groupName];
    for (const entry of entries) {
      const at = `@group(${groupIndex}) @binding(${entry.binding})`;
      if (entry.kind === "uniform") out.push(`${at} var<uniform> ${entry.name}: ${entry.type};`);
      else if (entry.kind === "resource") out.push(`${at} var ${entry.name}: ${entry.type};`);
      else out.push(`${at} var<storage, read> ${entry.name}: array<${entry.type}>;`);
    }
  }
  return out.join("\n");
}
const wgslBindingsPlugin = {
  collectData(context) {
    context.data.bindings = collectBindings(context.bits, context.template);
    context.data.structs = context.data.bindings.structs;
  },
  injectCode(context) {
    return { header: emitBindingsWgsl(context.data.bindings) };
  }
};
const WRITE_SLOT = "{{fragmentWriteOutputs}}";
function emitStructs(declared, locations) {
  const out = ["struct Outputs {"];
  for (const name in declared) out.push(`  ${name}: ${declared[name]},`);
  out.push("}", "", "struct FragmentOutput {");
  for (let i = 0; i < locations.length; i++) if (declared[locations[i]]) out.push(`  @location(${i}) ${locations[i]}: ${declared[locations[i]]},`);
  out.push("}");
  return out.join("\n");
}
const wgslFragmentOutputsPlugin = {
  collectData(context) {
    if (!context.templateString.includes(WRITE_SLOT)) return;
    context.data.outputs = collectFragmentOutputs(context.bits);
  },
  injectCode(context) {
    const declared = context.data.outputs;
    if (!declared) return {};
    const locations = context.outputLocations;
    return {
      header: emitStructs(declared, locations),
      fragmentDeclareOutputs: "var outputs: Outputs;",
      fragmentWriteOutputs: `return FragmentOutput(${locations.filter((name) => declared[name]).map((name) => `outputs.${name}`).join(", ")});`
    };
  }
};
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
function prefixSlotName(stage, slotName) {
  return `${stage}${capitalize(slotName)}`;
}
function warnUnprefixedSlots(templateSource) {
  const templateSlots = getCachedTemplateSlots(templateSource);
  for (const slotName of templateSlots) if (!(slotName === "header" || slotName === "textureGetters" || slotName.startsWith("vertex") || slotName.startsWith("fragment"))) {
    const vertexSuggestion = prefixSlotName("vertex", slotName);
    const fragmentSuggestion = prefixSlotName("fragment", slotName);
    warn(`[compileShader] Template slot {{${slotName}}} is not prefixed with "vertex" or "fragment". Did you mean {{${vertexSuggestion}}} or {{${fragmentSuggestion}}}?`);
  }
}
const wgslHeadersPlugin = {
  collectData(context) {
    warnUnprefixedSlots(context.templateString);
    context.data.headers = context.bits.map((b) => b.gpu?.header).filter((h) => !!h?.trim());
  },
  injectCode(context) {
    return { header: context.data.headers.join("\n\n") };
  }
};
const BUILTIN_NAMES = /* @__PURE__ */ new Set([
  "position",
  "frontFacing",
  "sampleIndex",
  "sampleMask"
]);
function needsFlatInterpolation(type) {
  return type === "i32" || type === "u32" || type.includes("<i32>") || type.includes("<u32>");
}
function warnInterStageConflict(name, newType, existingType) {
  warn(`[compileInterStageWgsl] Inter-stage variable "${name}" redefined with different type: "${existingType}" → "${newType}". Keeping original.`);
}
function collectInterStage(bits) {
  const interStage = /* @__PURE__ */ Object.create(null);
  for (const bit of bits) {
    if (!bit.interStage) continue;
    for (const [name, type] of Object.entries(bit.interStage)) {
      if (BUILTIN_NAMES.has(name)) continue;
      if (!(name in interStage)) interStage[name] = type;
      else if (interStage[name] !== type) warnInterStageConflict(name, type, interStage[name]);
    }
  }
  return interStage;
}
function emitInterStageWgsl(interStage) {
  const out = [];
  const names = Object.keys(interStage);
  out.push("struct VertexOutput {");
  out.push("  @builtin(position) position: vec4<f32>,");
  let locationIndex = 0;
  for (const name of names) {
    const type = interStage[name];
    const interpolate = needsFlatInterpolation(type) ? " @interpolate(flat)" : "";
    out.push(`  @location(${locationIndex++})${interpolate} ${name}: ${type},`);
  }
  out.push("}");
  out.push("");
  out.push("struct FragmentInput {");
  out.push("  @builtin(position) position: vec4<f32>,");
  out.push("  @builtin(front_facing) frontFacing: bool,");
  locationIndex = 0;
  for (const name of names) {
    const type = interStage[name];
    const interpolate = needsFlatInterpolation(type) ? " @interpolate(flat)" : "";
    out.push(`  @location(${locationIndex++})${interpolate} ${name}: ${type},`);
  }
  out.push("}");
  return out.join("\n");
}
const wgslInterStagePlugin = {
  collectData(context) {
    context.data.interStage = collectInterStage(context.bits);
  },
  injectCode(context) {
    return { header: emitInterStageWgsl(context.data.interStage) };
  }
};
const wgslOverridesPlugin = {
  collectData(context) {
    context.data.overrides = collectOverrideDefs(context.bits);
  },
  injectCode(context) {
    return { header: emitOverridesWgsl(context.data.overrides) };
  }
};
const NESTED_MARKER_PATTERN = /\{\{(.*?)\}\}/g;
function collectIndirectSlots(values) {
  const indirect = /* @__PURE__ */ new Set();
  for (const value of values) {
    if (!value) continue;
    for (const match of value.matchAll(NESTED_MARKER_PATTERN)) indirect.add(match[1]);
  }
  return indirect;
}
function warnUnusedSlots(templateSource, result) {
  const templateSlots = getCachedTemplateSlots(templateSource);
  const indirectSlots = collectIndirectSlots(Object.values(result));
  for (const [slotName, code] of Object.entries(result)) if (code && /\S/.test(code) && !templateSlots.has(slotName) && !indirectSlots.has(slotName)) warn(`[compileShader] Generated code for slot {{${slotName}}} but template doesn't have it. Slot names are prefixed with stage: vertex.input → {{vertexInput}}, fragment.end → {{fragmentEnd}}.`);
}
const wgslStageSlotsPlugin = {
  collectData(context) {
    context.data.vertexSlots = collectSlotCode(context.bits, "gpu", "vertex");
    context.data.fragmentSlots = collectSlotCode(context.bits, "gpu", "fragment");
  },
  injectCode(context) {
    const result = {};
    for (const [slotName, code] of Object.entries(context.data.vertexSlots)) result[prefixSlotName("vertex", slotName)] = code.join("\n");
    for (const [slotName, code] of Object.entries(context.data.fragmentSlots)) result[prefixSlotName("fragment", slotName)] = code.join("\n");
    warnUnusedSlots(context.templateString, result);
    return result;
  }
};
function narrowGpuLayout(source, bits) {
  const parsed = extractStructAndGroups(source);
  const layout = generateGpuLayoutGroups(parsed);
  const tags = /* @__PURE__ */ Object.create(null);
  for (const bit of bits) {
    if (!bit.bindings) continue;
    for (const [groupName, group] of Object.entries(bit.bindings)) {
      if (!group) continue;
      for (const { name, spec } of bindingFields(group, groupName)) if (!(name in tags)) tags[name] = bindingVisibility(spec);
    }
  }
  for (const g of parsed.groups) {
    const tag = tags[g.name];
    if (!tag || tag === "both") continue;
    const entry = layout[g.group]?.find((e) => e.binding === g.binding);
    if (entry) entry.visibility = tag === "vertex" ? ShaderStage.VERTEX : ShaderStage.FRAGMENT;
  }
  return layout;
}
const WGSL_DIRECTIVE = "diagnostic(off, derivative_uniformity);\n";
function compileWgslSource(options) {
  const { bits, template: template2, extraPlugins, instanceLayout, outputLocations = DEFAULT_OUTPUT_LOCATIONS } = options;
  const defaultPlugins = [
    instanceAccessPlugin,
    wgslOverridesPlugin,
    wgslBindingsPlugin,
    wgslAttributesPlugin,
    wgslInterStagePlugin,
    wgslFragmentOutputsPlugin,
    wgslHeadersPlugin,
    wgslStageSlotsPlugin
  ];
  const plugins = extraPlugins ? [...extraPlugins, ...defaultPlugins] : defaultPlugins;
  const context = {
    bits: resolveShaderBits(bits),
    template: template2,
    templateString: template2.gpu,
    data: {},
    instanceLayout,
    outputLocations
  };
  const source = `${WGSL_DIRECTIVE}${compileShader(context, plugins)}`;
  return {
    vertex: {
      source,
      entryPoint: "mainVertex"
    },
    fragment: {
      source,
      entryPoint: "mainFragment"
    },
    structs: context.data.structs || {},
    gpuLayout: narrowGpuLayout(source, context.bits),
    bits: context.bits
  };
}
function generateWgslMaterialAccessor(fields) {
  return generateWgslStructAccessor({
    name: "getMaterial",
    struct: "Material",
    fields,
    base: "i32(index)",
    load: (texel) => `textureLoad(uMaterialStorage, ${wgslTexelAddress(texel)}, 0)`
  });
}
const materialTextureAccessPlugin = { injectCode(context) {
  const material = context.data.structs?.Material;
  if (!material) return {};
  const access = "var material = getMaterial(vMaterialIndex);";
  return {
    textureGetters: generateWgslMaterialAccessor(material),
    vertexStoreAccess: access,
    fragmentStoreAccess: access
  };
} };
function textureGetters(funcName, index) {
  const pair = `uMaterialTexture${index}, uMaterialSampler${index}`;
  return [
    `fn ${funcName}Direct(uv: vec2<f32>) -> vec4<f32> {`,
    `  return textureSampleGrad(${pair}, uv, vec2<f32>(0.0), vec2<f32>(0.0));`,
    `}`,
    `fn ${funcName}(uv: vec2<f32>) -> vec4<f32> {`,
    `  return textureSample(${pair}, uv);`,
    `}`
  ];
}
function createTexturesPluginGpu(form) {
  return {
    collectData(context) {
      if (!context.bits.some((b) => b.name.startsWith("materialBindings:"))) context.bits.unshift(materialBindingsBit(context.bits, form));
    },
    injectCode(context) {
      let nextIndex = 0;
      const lines = [];
      for (const bit of context.bits) {
        if (!bit.textures) continue;
        for (const name of bit.textures) {
          const funcName = `sample${name[0].toUpperCase()}${name.slice(1)}`;
          lines.push(...textureGetters(funcName, nextIndex));
          nextIndex++;
        }
      }
      return { textureGetters: lines.join("\n") };
    }
  };
}
const scratchDescriptor = new ShaderDescriptor({});
const NO_OVERRIDES = new ShaderOverrides({});
const MATERIAL_PLUGINS = {
  direct: [materialStructPackPlugin, createTexturesPluginGpu("direct")],
  merged: [
    materialStructPackPlugin,
    materialTextureAccessPlugin,
    createTexturesPluginGpu("merged")
  ]
};
const gpuTemplate = `


{{header}}
{{textureGetters}}
{{vertexHeader}}

@vertex
fn mainVertex(input: VertexInput,
  @builtin(instance_index) ii: u32,
  @builtin(vertex_index) vid: u32
) -> VertexOutput {
  var output: VertexOutput;

  var position: vec4<f32>;
  var normal = vec3<f32>(0.0, 0.0, 1.0);
  var tangent = vec3<f32>(0.0);
  var uv = vec2<f32>(0.0);
  
  let inst = uRenderableInstanceStorage[ii];
  let renderable = uRenderableStorage[inst.id];
  let vMaterialIndex = renderable.materialIndex;
  {{vertexStoreAccess}}

  let batchWorldMatrix = uRenderableStorage[0].transform;
  var modelMatrix = batchWorldMatrix * renderable.transform;

  {{vertexInput}}

  {{vertexBeforeTransform}}

  var worldPosition = modelMatrix * position;
  let modelMatrix3 = mat3x3<f32>(modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz);

  let normalScale = 1.0 / vec3<f32>(
    dot(modelMatrix3[0], modelMatrix3[0]),
    dot(modelMatrix3[1], modelMatrix3[1]),
    dot(modelMatrix3[2], modelMatrix3[2])
  );
  var worldNormal = modelMatrix3 * (normal * normalScale);
  var clipPosition = camera.uViewProjectionMatrix * worldPosition;

  {{vertexAfterTransform}}

  {{vertexEnd}}

  output.position       = clipPosition;
  output.vPosition      = worldPosition.xyz;
  output.vNormal        = worldNormal;
  output.vUV            = uv;
  output.vMaterialIndex = renderable.materialIndex;

  return output;
}

@fragment
fn mainFragment(input: FragmentInput) -> FragmentOutput {
  {{fragmentDeclareOutputs}}
  var normal = normalize(input.vNormal);
  var albedo: vec3<f32> = vec3<f32>(1.0);
  var finalColor: vec3<f32>;
  var alpha: f32 = 1.0;

  let vMaterialIndex = input.vMaterialIndex;
  {{fragmentStoreAccess}}

  {{fragmentMaterial}}

  finalColor = albedo;

  {{fragmentLighting}}

  finalColor *= inputExposure(global.uExposure, global.uDisplayExposure);

  {{fragmentEnd}}

  outputs.color = vec4<f32>(finalColor * alpha, alpha);

  {{fragmentWriteOutputs}}
}
`;
const layoutBit = {
  name: "layout",
  overrideDefs: { HAS_UVS: {
    type: "u32",
    required: true
  } },
  outputs: { color: "vec4<f32>" },
  interStage: {
    vNormal: "vec3<f32>",
    vUV: "vec2<f32>",
    vPosition: "vec3<f32>",
    vMaterialIndex: "u32"
  }
};
const template = {
  bindGroups: [
    {
      name: "global",
      ubo: true
    },
    "camera",
    "batch"
  ],
  gpu: gpuTemplate
};
const BUDGETED_STAGES = [[ShaderStage.VERTEX, "vertex"], [ShaderStage.FRAGMENT, "fragment"]];
function assertStageBindingBudget(layout, materialGroup, limits, mesh, bits) {
  const { maxSamplersPerShaderStage, maxSampledTexturesPerShaderStage } = limits;
  for (const [stage, stageName] of BUDGETED_STAGES) {
    let textures = 0;
    let samplers = 0;
    let materialTextures = 0;
    let materialSamplers = 0;
    for (let g = 0; g < layout.length; g++) {
      const entries = layout[g];
      if (!entries) continue;
      for (const entry of entries) {
        if (!(entry.visibility & stage)) continue;
        if (entry.texture) {
          textures++;
          if (g === materialGroup) materialTextures++;
        }
        if (entry.sampler) {
          samplers++;
          if (g === materialGroup) materialSamplers++;
        }
      }
    }
    const samplersOver = samplers > maxSamplersPerShaderStage;
    if (!samplersOver && textures <= maxSampledTexturesPerShaderStage) continue;
    const samplerCount = `${samplers} samplers`;
    const samplerLimit = `${maxSamplersPerShaderStage} (maxSamplersPerShaderStage)`;
    const textureCount = `${textures} sampled textures`;
    const textureLimit = `${maxSampledTexturesPerShaderStage} (maxSampledTexturesPerShaderStage)`;
    const [over, overLimit, other] = samplersOver ? [
      samplerCount,
      samplerLimit,
      `Sampled textures: ${textures} of ${textureLimit}`
    ] : [
      textureCount,
      textureLimit,
      `Samplers: ${samplers} of ${samplerLimit}`
    ];
    const names = collectTextureNames(bits);
    throw new Error(`[MaterialSystemGpu] ${mesh.material.constructor.name}'s shader binds ${over} in the ${stageName} stage, but this device allows ${overLimit}. ${other}. The engine's globals take ${samplers - materialSamplers} samplers and ${textures - materialTextures} sampled textures, and the material's ${names.length} texture slots take ${materialSamplers} samplers and ${materialTextures} sampled textures: ${names.join(", ")}. Turn off a feature group or remove a texture slot.`);
  }
}
var MaterialSystemGpu = class {
  /** @ignore */
  static extension = {
    type: [ExtensionType.WebGPUSystem],
    name: "material3d"
  };
  batcher = new Mesh3DBatcher(this);
  _destroyed = false;
  _renderer;
  _shaderCache = /* @__PURE__ */ new Map();
  constructor(renderer) {
    this._renderer = renderer;
  }
  computeBatchKey(item, bit) {
    const cache = item._passCache[bit];
    return this._renderer.pipeline.getPipelineKey(item.geometry, cache.shader.gpuProgram, cache.state, cache.topology, cache.shader._overrides ?? NO_OVERRIDES);
  }
  compilePassShader(bits, template2) {
    const gpu = compileWgslSource({
      bits: [
        globalBitGpu,
        cameraBit,
        ...bits
      ],
      template: template2
    });
    assertBindGroups(gpu.bits, template2);
    return Shader.from({ gpu });
  }
  compileIsolatedShader(bits, template2, groups) {
    return Shader.from({
      gpu: compileWgslSource({
        bits,
        template: template2
      }),
      groups
    });
  }
  /**
  * Appends the position, morph and skinning bits in that order, so skinning moves the morphed vertex,
  * and adds what it appends to the key; validation reads the material, so it runs on cache hits too
  */
  compileShader(descriptor, mesh, batch, plugins, validateMaterial, form = "direct") {
    const finalBits = [];
    let key = "";
    if (descriptor.includeGlobal ?? true) {
      finalBits.push(globalBitGpu);
      key += `${globalBitGpu.name}|`;
    }
    if (descriptor.includeCamera ?? true) {
      finalBits.push(cameraBit);
      key += `${cameraBit.name}|`;
    }
    finalBits.push(...descriptor.bitsGpu);
    key += descriptor.keyGpu;
    const positionBit = getPositionBit(mesh.geometry.attributes.aPosition.format);
    assertBitIdentity(positionBit);
    finalBits.push(positionBit);
    key += `|${positionBit.name}`;
    if (mesh._morph) {
      if (mesh.geometry.hasMorphNormals) {
        finalBits.push(morphTargetNormalBitGpu);
        key += "|morphN";
      } else {
        finalBits.push(morphTargetBitGpu);
        key += "|morph";
      }
    }
    if (mesh.skeleton) {
      assertBitIdentity(skinningBitGpu);
      finalBits.push(skinningBitGpu);
      key += `|${skinningBitGpu.name}`;
    }
    if (batch.instanceStoreBuffer && readsInstanceData(finalBits)) key += `|inst:${batch.instanceStoreBuffer.layout.key}`;
    key += `|${form}`;
    let entry = this._shaderCache.get(key);
    if (!entry) {
      const gpu = compileWgslSource({
        bits: finalBits,
        template: descriptor.template,
        extraPlugins: plugins,
        instanceLayout: batch.instanceStoreBuffer?.layout,
        outputLocations: descriptor.outputLocations
      });
      assertBindGroups(gpu.bits, descriptor.template);
      assertStageBindingBudget(gpu.gpuLayout, resolveBindGroups(descriptor.template).findIndex((group) => group.name === "batch"), this._renderer.gpu.device.limits, mesh, gpu.bits);
      entry = {
        shader: Shader.from({
          gpu,
          overrides: descriptor.overrides
        }),
        layout: getMaterialLayout(gpu.bits)
      };
      this._shaderCache.set(key, entry);
    }
    if (validateMaterial) {
      validateMaterialTextureSlots(entry.layout, mesh.material);
      validateMaterialStruct(entry.layout, mesh.material);
    }
    return entry.shader;
  }
  /**
  * Looks the store up through `renderPipes` each call, since pixi builds pipes after systems, and drops
  * the merged shader, which `ensureMergedShader` rebuilds from the same bits
  */
  ensureMaterial(mesh, batch, view3d) {
    const material = mesh.material;
    this._renderer.renderPipes.view3d.materialStoreBuffer.register(material);
    const shader = this.compileShader(this._materialDescriptor(mesh, view3d), mesh, batch, MATERIAL_PLUGINS.direct, true);
    const passBit = material._passBit & RenderPassBit.MATERIAL_PASS_MASK;
    const pd = material._passes[passBit];
    const state = pd && pd.state || material.state;
    const topology = pd && pd.topology || material.topology || mesh.geometry.topology;
    const cache = mesh._passCache[passBit];
    if (!cache) mesh._passCache[passBit] = new MeshPassCache(shader, state, topology);
    else {
      cache.shader = shader;
      cache.mergedShader = null;
      cache.state = state;
      cache.topology = topology;
      cache.lastGeometryUid = -1;
    }
    return shader;
  }
  /** Call after `ensureMaterial` has built the mesh's pass cache entry this frame */
  ensureMergedShader(mesh, batch, view3d) {
    const cache = mesh._passCache[mesh.material._passBit & RenderPassBit.MATERIAL_PASS_MASK];
    if (cache.mergedShader) return cache.mergedShader;
    const descriptor = this._materialDescriptor(mesh, view3d);
    cache.mergedShader = this.compileShader(descriptor, mesh, batch, MATERIAL_PLUGINS.merged, true, "merged");
    return cache.mergedShader;
  }
  /**
  * Bits share slots and run in list order, so the order is load-bearing: normals settle before the
  * material's bits, billboarding before fog, fog before tone mapping, and the pass's output bits go last
  * @returns `scratchDescriptor`, which the next call overwrites
  */
  _materialDescriptor(mesh, view3d) {
    const geometry = mesh.geometry;
    const material = mesh.material;
    const fogBit = material.fog ? view3d._fogBit : null;
    const toneBit = view3d._toneMappingBit;
    const vertexColored = !!geometry.attributes.aColor && material.vertexColors;
    const colorSpaceBit = selectColorSpaceBit(material, toneBit, !!fogBit || vertexColored);
    const materialDescriptor = material.getPrimaryDescriptor(view3d);
    const bitsGpu = [
      globalBitGpu,
      layoutBit,
      colorSpaceBit
    ];
    if (geometry.attributes.aNormal) bitsGpu.push(normalBit);
    if (geometry.attributes.aUV) bitsGpu.push(getUvsBit(geometry.attributes.aUV.format));
    if (material.doubleSided) bitsGpu.push(doubleSidedNormalBit);
    if (material.flatShading) bitsGpu.push(flatShadingBit);
    const normalTexture = material.textures.normal;
    if (normalTexture && normalTexture !== NORMAL_MAP && geometry.attributes.aUV) bitsGpu.push(geometry.attributes.aTangent ? tangentNormalMappingBit : normalMappingBit);
    if (vertexColored) bitsGpu.push(vertexColorBit);
    const lit = mesh.material.lit;
    if (mesh.billboardMode !== "none") bitsGpu.push(getMeshBillboardBit(mesh.billboardMode, lit));
    const hasTangent = !!geometry.attributes.aTangent;
    for (let i = 0; i < materialDescriptor.bitsGpu.length; i++) {
      const bit = materialDescriptor.bitsGpu[i];
      bitsGpu.push(hasTangent ? anisotropyTangentVariant(bit) : bit);
    }
    if (material.alphaMode === "opaque") bitsGpu.push(alphaOpaqueBit);
    if (fogBit) bitsGpu.push(fogBit);
    if (colorSpaceBit !== displayColorSpaceBit && toneBit) bitsGpu.push(material._skipsToneCurve ? srgbEncodeBit : toneBit);
    if (lit) bitsGpu.push(mesh.receiveShadow && view3d._hasShadows ? shadowBitsGpu[view3d.shadowFilter] : noShadowBit, decodeToLinearBit(toneBit !== null));
    const pass = view3d.passByBit[material._passBit & RenderPassBit.MATERIAL_PASS_MASK];
    const outputLocations = addPassMaterialBits(bitsGpu, pass, !!materialDescriptor.template);
    return scratchDescriptor.update({
      bitsGpu,
      template: materialDescriptor.template ?? template,
      overrides: {
        HAS_UVS: geometry.attributes.aUV ? 1 : 0,
        ...materialDescriptor.overrides
      },
      outputLocations,
      includeGlobal: false
    });
  }
  /**
  * Leaves the programs, which pixi's process-wide program cache owns; the batcher holds no GPU
  * resources, its bind groups belonging to each `DrawCommandList`
  */
  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    for (const { shader } of this._shaderCache.values()) shader.destroy();
    this._shaderCache = null;
  }
};
const ACCEPT_ALL_PLANES = /* @__PURE__ */ new Float32Array(24);
const GPU_VISIBILITY_MIN = 4e3;
function produceVisibilityCompaction(compute, list, batch, boundsBuffer, result) {
  if (result.lastVisibilityDirtyId === batch._visibilityDirtyId) return;
  result.lastVisibilityDirtyId = batch._visibilityDirtyId;
  if (result.direct || list.view.count < 4e3) {
    produceCpuCompaction(list, batch, null, result);
    return;
  }
  compute.dispatch(result.indirectDrawData.drawCallsBuffer, list.gpuData.instanceBuffer.buffer, result.survivors.buffer, batch.storeBuffer.buffer, boundsBuffer, ACCEPT_ALL_PLANES, list.commandList.count, list.view.count);
}
function produceCpuCompaction(list, batch, planes, result) {
  const src = list.gpuData.instanceBuffer.data;
  const survivors = result.survivors;
  const args = result.indirectDrawData;
  const dst = survivors.data;
  const drawCalls = args.drawCalls;
  const commandCount = list.commandList.count;
  const totalInstances = list.view.count;
  const visible = batch.storeBuffer.visible;
  if (planes !== null) batch._ensureSpheres();
  const spheres = batch.storeBuffer.boundingSpheres;
  const frustum = planes !== null;
  const tp = frustum ? transformFrustumToBatch(planes, batch.storeBuffer.data) : ACCEPT_ALL_PLANES;
  const p0x = tp[0];
  const p0y = tp[1];
  const p0z = tp[2];
  const p0w = tp[3];
  const p1x = tp[4];
  const p1y = tp[5];
  const p1z = tp[6];
  const p1w = tp[7];
  const p2x = tp[8];
  const p2y = tp[9];
  const p2z = tp[10];
  const p2w = tp[11];
  const p3x = tp[12];
  const p3y = tp[13];
  const p3z = tp[14];
  const p3w = tp[15];
  const p4x = tp[16];
  const p4y = tp[17];
  const p4z = tp[18];
  const p4w = tp[19];
  const p5x = tp[20];
  const p5y = tp[21];
  const p5z = tp[22];
  const p5w = tp[23];
  let countsChanged = false;
  for (let k = 0; k < commandCount; k++) {
    const start = drawCalls[k * 5 + 4];
    const end = k + 1 < commandCount ? drawCalls[(k + 1) * 5 + 4] : totalInstances;
    let w = start;
    for (let i = start; i < end; i++) {
      const id = src[i];
      if (visible[id] === 0) continue;
      if (frustum) {
        const so = id * 4;
        const radius = spheres[so + 3];
        if (radius >= 0) {
          const wcx = spheres[so];
          const wcy = spheres[so + 1];
          const wcz = spheres[so + 2];
          if (p0x * wcx + p0y * wcy + p0z * wcz + p0w < -radius || p1x * wcx + p1y * wcy + p1z * wcz + p1w < -radius || p2x * wcx + p2y * wcy + p2z * wcz + p2w < -radius || p3x * wcx + p3y * wcy + p3z * wcz + p3w < -radius || p4x * wcx + p4y * wcy + p4z * wcz + p4w < -radius || p5x * wcx + p5y * wcy + p5z * wcz + p5w < -radius) continue;
        }
      }
      dst[w++] = id;
    }
    const count = w - start;
    if (drawCalls[k * 5 + 1] !== count) {
      drawCalls[k * 5 + 1] = count;
      countsChanged = true;
    }
  }
  if (countsChanged) result.countsDirtyId++;
  survivors.upload(totalInstances);
  if (!result.direct) args.upload(commandCount);
}
function prepareForwardBatchesGpu(options) {
  const { pipe, bit, bindsMaterial, session, useBundles, sortBatch } = options;
  if (!useBundles) return;
  const { view3d } = session;
  const batcher = pipe.renderer.material3d.batcher;
  const cameraPosition = getCameraData(options.camera ?? view3d.camera).position;
  for (const batch of view3d._meshBatches) {
    if (!batch.renderData._worldVisible) continue;
    const list = batch.drawLists[bit];
    if (!list) continue;
    const renderables = list.view;
    if (renderables.count === 0) continue;
    if (!(sortBatch ? list.isDrawStale() : list.nextBuild(view3d._updateTick))) continue;
    if (sortBatch) sortBatch(renderables, batch, cameraPosition);
    const gpuData = list.gpuData;
    gpuData.instanceBuffer.populateIds(renderables);
    batcher.render({
      renderables,
      globalBindGroup: session.globalBindGroup,
      commandList: list.commandList,
      drawData: list.drawData,
      passBit: bit,
      bindsMaterial,
      batch,
      view3d
    });
    gpuData.instanceBuffer.upload(renderables.count);
  }
}
function computeForwardBatchesGpu(options) {
  const { pipe, bit, cullResults, session, useBundles } = options;
  if (!useBundles) return;
  const { view3d } = session;
  const cpuSubmission = cpuSubmissionLimit("forward");
  const boundsBuffer = pipe.geometryDataStoreBuffer.buffer;
  const planes = (options.camera ?? view3d.camera).cullFrustum.planesData;
  cullResults.removeDetached(view3d);
  for (const batch of view3d._meshBatches) {
    if (!batch.renderData._worldVisible) continue;
    const list = batch.drawLists[bit];
    if (!list || list.view.count === 0) continue;
    list.claimDrawBuilt();
    const direct = list.view.count <= cpuSubmission;
    const result = cullResults.ensure(batch);
    result.sync(list, direct);
    const producer = resolveCullProducer(batch.cull, !direct);
    if (producer === "off") {
      produceVisibilityCompaction(pipe.renderer.compute3d, list, batch, boundsBuffer, result);
      continue;
    }
    if (producer === "cpu") {
      produceCpuCompaction(list, batch, planes, result);
      continue;
    }
    const batchPlanes = transformFrustumToBatch(planes, batch.storeBuffer.data);
    pipe.renderer.compute3d.dispatch(result.indirectDrawData.drawCallsBuffer, list.gpuData.instanceBuffer.buffer, result.survivors.buffer, batch.storeBuffer.buffer, boundsBuffer, batchPlanes, list.commandList.count, list.view.count);
  }
}
function renderForwardBatchesGpu(options) {
  const { pipe, bit, bindsMaterial, cullResults, session, useBundles, sortBatch } = options;
  const { view3d } = session;
  const encoder = pipe.renderer.encoder;
  const batcher = pipe.renderer.material3d.batcher;
  const gcNow = pipe.renderer.gc.now;
  const camera = options.camera ?? view3d.camera;
  const cameraData = getCameraData(camera);
  const planes = camera.cullFrustum.planesData;
  const boundsBuffer = pipe.geometryDataStoreBuffer.buffer;
  const cpuSubmission = cpuSubmissionLimit("forward");
  if (!useBundles) cullResults.removeDetached(view3d);
  let bundleIndex = 0;
  for (const batch of view3d._meshBatches) {
    if (!batch.renderData._worldVisible) continue;
    const list = batch.drawLists[bit];
    if (!list) continue;
    const renderables = list.view;
    if (renderables.count === 0) {
      list.claimDrawEmpty();
      if (useBundles) {
        const result2 = cullResults.get(batch);
        if (result2) {
          result2.bundle = null;
          result2.claimBundleRecorded(list, cameraData.bindGroup);
        }
      }
      continue;
    }
    const result = cullResults.ensure(batch);
    if (useBundles && result.direct && batch.cull !== "off") {
      result.bundle = null;
      bindBatchStorage(session, batch, result);
      list.claimDrawBuilt();
      list.commandList.replayDirect(encoder, result.indirectDrawData, cameraData);
      continue;
    }
    if (useBundles) {
      const recorded = result.bundle;
      if (!recorded || result.isBundleStale(list, cameraData.bindGroup) || !encoder.isBundleValid(recorded)) {
        bindBatchStorage(session, batch, result);
        encoder.beginBundle(`view3d pass ${bit} batch ${batch.uid}`);
        if (result.direct) list.commandList.replayDirect(encoder, result.indirectDrawData, cameraData);
        else list.commandList.replay(encoder, pipe.renderer.buffer, result.indirectDrawData, cameraData, 0, list.commandList.bodyCount);
        result.bundle = encoder.endBundle();
        result.claimBundleRecorded(list, cameraData.bindGroup);
      }
    } else {
      let rebuild = true;
      if (sortBatch) {
        sortBatch(renderables, batch, cameraData.position);
        rebuild = list.isDrawStale() || list.isOrderStale();
      } else list.nextBuild(view3d._updateTick, true);
      const gpuData = list.gpuData;
      if (rebuild) {
        gpuData.instanceBuffer.populateIds(renderables);
        batcher.render({
          renderables,
          globalBindGroup: session.globalBindGroup,
          commandList: list.commandList,
          drawData: list.drawData,
          passBit: bit,
          bindsMaterial,
          batch,
          view3d
        });
        gpuData.instanceBuffer.upload(renderables.count);
      }
      const direct = renderables.count <= cpuSubmission;
      result.sync(list, direct);
      bindBatchStorage(session, batch, result);
      const producer = resolveCullProducer(batch.cull, !sortBatch && !direct);
      if (producer === "gpu") {
        const batchPlanes = transformFrustumToBatch(planes, batch.storeBuffer.data);
        pipe.renderer.compute3d.dispatch(result.indirectDrawData.drawCallsBuffer, gpuData.instanceBuffer.buffer, result.survivors.buffer, batch.storeBuffer.buffer, boundsBuffer, batchPlanes, list.commandList.count, list.view.count);
      } else produceCpuCompaction(list, batch, producer === "cpu" ? planes : null, result);
    }
    list.claimDrawBuilt();
    if (useBundles) {
      const commandList = list.commandList;
      commandList.touch(gcNow);
      bundleRun[bundleIndex++] = result.bundle;
      if (!result.direct && commandList.count > commandList.bodyCount) {
        bindBatchStorage(session, batch, result);
        commandList.replay(encoder, pipe.renderer.buffer, result.indirectDrawData, cameraData, commandList.bodyCount);
      }
    } else if (result.direct) list.commandList.replayDirect(encoder, result.indirectDrawData, cameraData);
    else list.commandList.replay(encoder, pipe.renderer.buffer, result.indirectDrawData, cameraData);
  }
  if (bundleIndex > 0) {
    encoder.executeBundle(bundleRun);
    bundleRun.length = 0;
  }
}
function bindBatchStorage(session, batch, result) {
  session.globalBindGroup.setResource(batch.storeBuffer.bufferResource, "uRenderableStorage");
  session.globalBindGroup.setResource(result.survivors.bufferResource, "uRenderableInstanceStorage");
  session.globalBindGroup.setResource(batch.instanceStoreBuffer?.bufferResource ?? EMPTY_BUFFER_RESOURCE, "uInstanceStorage");
}
const bundleRun = [];
GlobalResourceRegistry.register({ clear: () => {
  bundleRun.length = 0;
} });
const shadowGlobalBitGpu = {
  name: "shadowGlobal",
  structs: {
    Renderable: RenderableStruct,
    RenderableInstance: RenderableInstanceStruct,
    BoneMatrix: BoneMatrixStruct,
    GeometryData: GeometryDataStruct
  },
  bindings: { global: {
    uRenderableStorage: {
      type: "storage<Renderable>",
      visibility: "vertex"
    },
    uRenderableInstanceStorage: {
      type: "storage<RenderableInstance>",
      visibility: "vertex"
    },
    uBonePitStorage: {
      type: "storage<BoneMatrix>",
      visibility: "vertex"
    },
    uMorphStorage: {
      type: "storage<f32>",
      visibility: "vertex"
    },
    uGeometryStorage: {
      type: "storage<GeometryData>",
      visibility: "vertex"
    }
  } }
};
const shadowTemplate = {
  bindGroups: [
    {
      name: "global",
      ubo: true
    },
    "camera",
    "local"
  ],
  gpu: `

{{header}}
{{vertexHeader}}

@vertex
fn mainVertex(
  input: VertexInput,
  @builtin(instance_index) ii: u32,
  @builtin(vertex_index) vid: u32
) -> VertexOutput {
  var output: VertexOutput;

  var position: vec4<f32>;

  let renderable = uRenderableStorage[uRenderableInstanceStorage[ii].id];
  let batchWorldMatrix = uRenderableStorage[0].transform;

  var normal = vec3<f32>(0.0);
  var tangent = vec3<f32>(0.0);

  {{vertexInput}}

  let worldPosition = batchWorldMatrix * renderable.transform * position;
  let clipPosition = camera.uViewProjectionMatrix * worldPosition;

  output.position = clipPosition;

  {{vertexEnd}}

  return output;
}

@fragment
fn mainFragment(input: FragmentInput){
}
`
};
var ShadowRenderPassGpu = class extends ShadowRenderPassBase {
  /** Emptied after each replay; `bundleRun` in `renderForwardBatchesGpu.ts` says why */
  _bundleRun = [];
  constructor(options) {
    const shadowState = stateFor3D();
    shadowState.depthTest = true;
    shadowState.depthMask = true;
    shadowState.culling = true;
    shadowState.clockwiseFrontFace = false;
    shadowState.blend = false;
    super({
      renderer: options.renderer,
      name: "shadow",
      description: "Renders shadow-casting scene geometry into each light shadow map.",
      bit: RenderPassBit.SHADOW,
      shadowMapHandle: options.shadowMapHandle,
      descriptor: {
        shaderDescriptor: {
          bitsGpu: [shadowGlobalBitGpu],
          template: shadowTemplate,
          includeGlobal: false
        },
        state: shadowState
      }
    });
  }
  _applyZRangeFix = true;
  /**
  * Binds the shadow map before anything claims a bundle version, since binding a new map re-records
  * every bundle, and drops detached batches' results for every light, casting this frame or not
  */
  prepare(session) {
    const { view3d, lights } = session;
    this._bindShadowSource(view3d, this.renderTarget.depthStencilTexture);
    const batcher = this.pipe.renderer.material3d.batcher;
    const computeSystem = this.pipe.renderer.compute3d;
    const boundsBuffer = this.pipe.geometryDataStoreBuffer.buffer;
    for (const batch of view3d._meshBatches) {
      if (!batch.renderData._worldVisible) continue;
      const list = batch.drawLists[this.bit];
      if (!list) continue;
      const gpuData = list.gpuData;
      const renderables = list.view;
      if (renderables.count === 0) {
        list.claimDrawEmpty();
        continue;
      }
      if (list.nextBuild(view3d._updateTick)) {
        list.claimDrawBuilt();
        gpuData.instanceBuffer.populateIds(renderables);
        batcher.render({
          renderables,
          globalBindGroup: session.globalBindGroup,
          commandList: list.commandList,
          drawData: list.drawData,
          passBit: this.bit,
          bindsMaterial: false,
          batch,
          view3d
        });
        gpuData.instanceBuffer.upload(renderables.count);
      }
    }
    for (let i = 0; i < lights.length; i++) {
      const light = lights[i];
      const data = light._gpuShadowData;
      if (!data) continue;
      data.cullResults?.removeDetached(view3d);
      if (!castsShadowThisFrame(light)) continue;
      const cascadeCount = cascadeCountFor(light);
      const cascades = data.cascades;
      const results = data.cullResults ??= new CullResults();
      const cpuSubmission = cpuSubmissionLimit("shadow");
      for (let c = 0; c < cascadeCount; c++) {
        const slot = cascades?.[c];
        if (!slot || !slot.needsRender) continue;
        const frustum = slot.cameraData.frustum;
        for (const batch of view3d._meshBatches) {
          if (!batch.renderData._worldVisible) continue;
          const list = batch.drawLists[this.bit];
          if (!list || list.view.count === 0) continue;
          if (c === 0) for (let s = cascadeCount; s < 4; s++) results.remove(batch, s);
          const direct = list.view.count <= cpuSubmission;
          const result = results.ensure(batch, c);
          result.sync(list, direct);
          const producer = resolveCullProducer(batch.cull, !direct);
          if (producer === "off") produceVisibilityCompaction(computeSystem, list, batch, boundsBuffer, result);
          else if (producer === "cpu") produceCpuCompaction(list, batch, frustum.planesData, result);
          else {
            const batchPlanes = transformFrustumToBatch(frustum.planesData, batch.storeBuffer.data);
            computeSystem.dispatch(result.indirectDrawData.drawCallsBuffer, list.gpuData.instanceBuffer.buffer, result.survivors.buffer, batch.storeBuffer.buffer, boundsBuffer, batchPlanes, list.commandList.count, list.view.count);
          }
        }
      }
    }
  }
  /**
  * Binds each layer rather than pushing it, and resets `activeTarget`, as the next pass binds its own;
  * cascade camera buffers opt out of pixi's GC, which can't see bundles use them, and
  * `releaseShadowCascades` frees them
  */
  render(session) {
    const { view3d, lights } = session;
    const renderer = this.pipe.renderer;
    const encoder = renderer.encoder;
    const pipeline = renderer.pipeline;
    pipeline.setColorMask(0);
    for (const light of lights) {
      if (!castsShadowThisFrame(light)) continue;
      const results = this.getShadowGPUData(light).cullResults;
      if (!results) continue;
      const cascadeCount = cascadeCountFor(light);
      for (let c = 0; c < cascadeCount; c++) {
        const cascade = this._cascadeSlot(light, c);
        if (!cascade.needsRender) continue;
        const layerIndex = light._shadowDataIndex + c;
        const cameraBindGroup = cascade.cameraData.bindGroup;
        renderer.renderTarget.bind({
          target: this.renderTarget,
          clear: true,
          layer: layerIndex
        });
        renderer.ubo.updateUniformGroup(cascade.cameraData.uniformGroup);
        cascade.cameraData.uniformGroup.buffer.autoGarbageCollect = false;
        for (const batch of view3d._meshBatches) {
          if (!batch.renderData._worldVisible) continue;
          const list = batch.drawLists[this.bit];
          if (!list || list.view.count === 0) continue;
          const result = results.get(batch, c);
          if (!result) continue;
          if (result.direct && batch.cull !== "off") {
            result.bundle = null;
            session.globalBindGroup.setResource(batch.storeBuffer.bufferResource, "uRenderableStorage");
            session.globalBindGroup.setResource(result.survivors.bufferResource, "uRenderableInstanceStorage");
            list.commandList.replayDirect(encoder, result.indirectDrawData, cascade.cameraData);
            continue;
          }
          const recorded = result.bundle;
          if (!recorded || result.isBundleStale(list, cameraBindGroup) || !encoder.isBundleValid(recorded)) {
            const { globalBindGroup } = session;
            globalBindGroup.setResource(batch.storeBuffer.bufferResource, "uRenderableStorage");
            globalBindGroup.setResource(result.survivors.bufferResource, "uRenderableInstanceStorage");
            encoder.beginBundle(`shadow cascade ${c} batch ${batch.uid}`);
            if (result.direct) list.commandList.replayDirect(encoder, result.indirectDrawData, cascade.cameraData);
            else list.commandList.replay(encoder, renderer.buffer, result.indirectDrawData, cascade.cameraData, 0, list.commandList.bodyCount);
            result.bundle = encoder.endBundle();
            result.claimBundleRecorded(list, cameraBindGroup);
          }
          const commandList = list.commandList;
          commandList.touch(renderer.gc.now);
          this._bundleRun.push(result.bundle);
          if (!result.direct && commandList.count > commandList.bodyCount) {
            session.globalBindGroup.setResource(batch.storeBuffer.bufferResource, "uRenderableStorage");
            session.globalBindGroup.setResource(result.survivors.bufferResource, "uRenderableInstanceStorage");
            commandList.replay(encoder, renderer.buffer, result.indirectDrawData, cascade.cameraData, commandList.bodyCount);
          }
        }
        if (this._bundleRun.length > 0) {
          encoder.executeBundle(this._bundleRun);
          this._bundleRun.length = 0;
        }
      }
      this._completeShadowUpdate(light);
    }
    pipeline.setColorMask(15);
    session.activeTarget = null;
  }
};
const DEFAULT_FOG_COLOR = 13421772;
const scratchFogColor = new Color();
const scratchCopyRegion = new Rectangle();
const scratchCopyDest = {
  x: 0,
  y: 0
};
var View3DPipeGpu = class {
  /** @ignore */
  static extension = {
    type: [ExtensionType.WebGPUPipes],
    name: "view3d"
  };
  renderer;
  _brdfLutTexture;
  _iblEnvironmentMap = /* @__PURE__ */ new Map();
  /**
  * Unloads rather than destroys the cube, since a view's bind group may hold it until its next frame,
  * and pixi warns when a resource dies under a bind group
  */
  _onEnvironmentDestroy = (source) => {
    this._iblEnvironmentMap.get(source)?.source.unload();
    this._iblEnvironmentMap.delete(source);
  };
  /** `RenderSession.viewport` for every view, since views render one at a time */
  _viewport = new Rectangle();
  /** Bound once, so a frame allocates no closure */
  _sortForwardByDistance = (renderables, batch, cameraPosition) => {
    calculateTransparentDistances(renderables, batch.storeBuffer.data, cameraPosition);
  };
  /** Refilled per call so a pass allocates none, and cleared after so the pipe holds no frame's objects */
  _forwardOptions = {
    pipe: this,
    bit: 0,
    bindsMaterial: false,
    cullResults: null,
    camera: null,
    session: null,
    useBundles: false,
    sortBatch: void 0
  };
  /** Made in `contextChange`, since its alignment comes from device limits that don't exist yet here */
  materialStoreBuffer;
  _morphStoreBuffer = new MorphStoreBuffer();
  geometryDataStoreBuffer = new GeometryDataStoreBuffer();
  atlasPool = GeometryAtlasPool.from({ rebaseIndices: false });
  _managedViews;
  _destroyed = false;
  _colorOutputDraw = null;
  /** Joins the `contextChange` runner itself, since pixi joins only systems to it */
  constructor(renderer) {
    this.renderer = renderer;
    this._managedViews = new View3DGCRegistry(this.renderer);
    this.renderer.runners.contextChange.add(this);
  }
  /**
  * Runs after the limits system, which joined the runner first, and keeps the store across a device
  * restore, since materials hold places in it
  */
  contextChange(gpu) {
    if (!gpu.device.features.has("indirect-first-instance")) throw new Error("@pixi/3d requires the WebGPU 'indirect-first-instance' feature (used by the batched indirect draw path).");
    this.materialStoreBuffer ??= new MaterialDataStoreBuffer({
      alignment: this.renderer.limits.minUniformBufferOffsetAlignment,
      rendererType: this.renderer.type
    });
  }
  createShadowPass(options) {
    return new ShadowRenderPassGpu({
      renderer: this.renderer,
      shadowMapHandle: options.shadowMapHandle
    });
  }
  renderForward(desc, session) {
    renderForwardBatchesGpu(this._fillForwardOptions(desc, session, desc.sort === "distance"));
    this._releaseForwardOptions();
  }
  prepareForward(desc, session) {
    if (!cachesDrawWork(desc)) return;
    const options = this._fillForwardOptions(desc, session, false);
    prepareForwardBatchesGpu(options);
    computeForwardBatchesGpu(options);
    this._releaseForwardOptions();
  }
  _fillForwardOptions(desc, session, sortByDistance) {
    const options = this._forwardOptions;
    options.useBundles = cachesDrawWork(desc);
    options.bit = desc.bit;
    options.bindsMaterial = desc.bindsMaterial;
    options.cullResults = desc.cullResults;
    options.camera = desc.camera;
    options.session = session;
    options.sortBatch = sortByDistance ? this._sortForwardByDistance : void 0;
    return options;
  }
  _releaseForwardOptions() {
    this._forwardOptions.cullResults = null;
    this._forwardOptions.camera = null;
    this._forwardOptions.session = null;
  }
  renderGeometry(geometry, shader, state) {
    this.renderer.encoder.draw({
      geometry,
      shader,
      state
    });
  }
  /** Casts, since pixi's encoder reads only the rect's four numbers */
  setViewport(viewport) {
    this.renderer.encoder.setViewport(viewport);
  }
  _depthClearShader = null;
  _depthClearState = null;
  /** Draws at the far plane with colour masked off, clipped by the viewport the executor already set */
  clearDepth(_session) {
    if (!this._depthClearShader) this._buildDepthClear();
    const { encoder, pipeline } = this.renderer;
    pipeline.setColorMask(0);
    encoder.draw({
      geometry: fullscreenTriangleGeometry(),
      shader: this._depthClearShader,
      state: this._depthClearState
    });
    pipeline.setColorMask(15);
  }
  /** `depthTest: false` is pixi's compare `'always'`, so with `depthMask` every pixel takes the far plane */
  _buildDepthClear() {
    const state = new State();
    state.depthTest = false;
    state.depthMask = true;
    state.culling = false;
    state.blend = false;
    this._depthClearState = state;
    this._depthClearShader = Shader.from({ gpu: {
      vertex: {
        entryPoint: "mainVertex",
        source: `
            struct VertexOutput { @builtin(position) position: vec4<f32> };

            @vertex
            fn mainVertex(@location(0) aPosition: vec2<f32>) -> VertexOutput {
              var output: VertexOutput;
              output.position = vec4<f32>(aPosition, 1.0, 1.0);
              return output;
            }
          `
      },
      fragment: {
        entryPoint: "mainFragment",
        source: `
            @fragment
            fn mainFragment() -> @location(0) vec4<f32> {
              return vec4<f32>(0.0, 0.0, 0.0, 1.0);
            }
          `
      }
    } });
  }
  /** Closes the open pass, since WebGPU can't copy inside one, and nulls `activeTarget` for the executor to reopen */
  copyColor(source, dest, session) {
    const { target, viewport } = source;
    if (!target.colorTexture) return;
    this.renderer.renderTarget.finishRenderPass();
    const frame = dest.frame;
    const resolution = dest.source.resolution;
    scratchCopyDest.x = Math.round(frame.x * resolution);
    scratchCopyDest.y = Math.round(frame.y * resolution);
    this.renderer.renderTarget.copyToTexture(target, dest, scratchCopyRegion.copyFrom(viewport), scratchCopyRegion, scratchCopyDest);
    session.activeTarget = null;
  }
  /** Closes the open pass, as `copyColor` does */
  outputColor(source, dest, session, toneMapping) {
    if (!source.target.colorTexture) return;
    this.renderer.renderTarget.finishRenderPass();
    (this._colorOutputDraw ??= new ColorOutputDraw(this.renderer)).draw(this, source, dest, toneMapping);
    session.activeTarget = null;
  }
  /** Closes the pass an effect may have left open, as `MipChainSystemGpu` begins passes of its own */
  generateMips(handle, session) {
    const source = session.view3d._graph.getTexture(handle, session).source;
    this.renderer.renderTarget.finishRenderPass();
    session.activeTarget = null;
    this.renderer.mipChain3d.generate(source);
  }
  /** WebGPU resolves into the texture when the render pass ends */
  resolveColor() {
  }
  /** Closes the open pass, as `copyColor` does */
  copyDepth(source, dest, session) {
    const { target, viewport } = source;
    if (!target.depthStencilTexture) return;
    this.renderer.renderTarget.finishRenderPass();
    scratchCopyDest.x = 0;
    scratchCopyDest.y = 0;
    this.renderer.renderTarget.copyDepthTexture(target, dest, scratchCopyRegion.copyFrom(viewport), scratchCopyRegion, scratchCopyDest);
    session.activeTarget = null;
  }
  validateRenderable() {
    return false;
  }
  addRenderable(view3d, instructionSet) {
    this.renderer.renderPipes.batch.break(instructionSet);
    instructionSet.add(view3d);
  }
  updateRenderable() {
  }
  /**
  * Re-records the bundles when the environment cube changes, and re-binds the stores every frame, after
  * the scene update may have grown them. A view with no meshes draws nothing, background included.
  */
  execute(view3d) {
    if (!view3d.isRenderable) return;
    const gpuData = getGlobalGpuData(view3d, this.renderer);
    const defaultTarget = this.renderer.renderTarget.renderTarget;
    view3d._ensureInitialized(this.renderer, gpuData, defaultTarget.colorTexture.source.resolution);
    this._managedViews.track(view3d);
    const env = view3d.environment;
    if (env) {
      this._brdfLutTexture ||= generateBrdfLut({ renderer: this.renderer });
      gpuData.globalBindGroup.setResource(this._brdfLutTexture.source, "uBrdfLutTexture");
    }
    const environmentSource = this._prefilteredEnvironment(env);
    if (gpuData.globalBindGroup.getResource("uEnvironmentTexture") !== environmentSource) {
      gpuData.globalBindGroup.setResource(environmentSource, "uEnvironmentTexture");
      view3d._invalidateBundleCaches();
    }
    const lights = view3d.lights;
    if (view3d._meshSlots.count === 0 && view3d._meshBatches.length === 1) return;
    const renderSession = {
      view3d,
      lights,
      defaultTarget,
      defaultFrontFaceInverted: false,
      activeTarget: null,
      needsDepthClear: true,
      viewport: this._viewport,
      activeViewport: this._viewport,
      globalBindGroup: gpuData.globalBindGroup,
      renderer: this.renderer
    };
    if (!updateView3DScene(view3d, this, renderSession)) return;
    gpuData.globalBindGroup.setResource(this.materialStoreBuffer.texture.source, "uMaterialStorage");
    gpuData.globalBindGroup.setResource(view3d._bonePit.bufferResource, "uBonePitStorage");
    gpuData.globalBindGroup.setResource(this._morphStoreBuffer.bufferResource, "uMorphStorage");
    gpuData.globalBindGroup.setResource(this.geometryDataStoreBuffer.bufferResource, "uGeometryStorage");
    this.materialStoreBuffer.update();
    this.geometryDataStoreBuffer.update();
    this.atlasPool.update();
    if (detectSharedCacheInvalidation(this.atlasPool, this.materialStoreBuffer, gpuData, this._morphStoreBuffer, this.geometryDataStoreBuffer)) view3d._invalidateDrawCaches();
    this.prepareView(renderSession);
    view3d._graph.run(renderSession);
  }
  /**
  * Unloads the views first, so their bind groups go before what they bind; `atlasPool` outlives the
  * renderer, as `GeometryAtlasPool.from` says
  */
  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this._managedViews.destroy();
    this._colorOutputDraw?.destroy();
    this._colorOutputDraw = null;
    this._brdfLutTexture?.destroy(true);
    this._brdfLutTexture = void 0;
    for (const [source, cube] of this._iblEnvironmentMap) {
      source.off("destroy", this._onEnvironmentDestroy);
      cube.destroy(true);
    }
    this._iblEnvironmentMap = null;
    this.renderer.runners.contextChange.remove(this);
    this.materialStoreBuffer.destroy();
    this.materialStoreBuffer = null;
    this._morphStoreBuffer.destroy();
    this.geometryDataStoreBuffer.destroy();
    this._depthClearShader?.destroy();
    this._depthClearShader = null;
    this._depthClearState = null;
  }
  _prefilteredEnvironment(env) {
    if (!(env instanceof CubeTexture) || env.source.destroyed) return CUBETEXTURE_EMPTY.source;
    let cube = this._iblEnvironmentMap.get(env.source);
    if (!cube) {
      cube = generateIblSpecialCubemap({
        renderer: this.renderer,
        sourceTexture: env
      });
      this._iblEnvironmentMap.set(env.source, cube);
      env.source.once("destroy", this._onEnvironmentDestroy);
    }
    return cube.source;
  }
  prepareView(session) {
    const { view3d, lights } = session;
    this.renderer.lighting3d.update(view3d, lights);
    this._updateGlobalUniforms(view3d);
  }
  /**
  * Uploads the static group itself, since bundles replay without pixi's per-draw sync, and rewrites the
  * fog colour every frame, since it carries `exposure`, which can change alone
  */
  _updateGlobalUniforms(view3d) {
    const { fog } = view3d;
    const globalUniformGroup = getGlobalGpuData(view3d, this.renderer).globalUniformGroup;
    const globalUniforms = globalUniformGroup.uniforms;
    globalUniforms.uTime = performance.now() / 1e3;
    globalUniforms.uExposure = view3d.exposure;
    globalUniforms.uDisplayExposure = Math.pow(view3d.exposure, 1 / 2.2);
    if (fog) {
      scratchFogColor.setValue(fog.color ?? DEFAULT_FOG_COLOR);
      writeLinearRgb(globalUniforms.uFogColor, 0, scratchFogColor, view3d.exposure);
      const fogParams = globalUniforms.uFogParams;
      fogParams[0] = fog.near || 0;
      fogParams[1] = fog.far || 99999999;
      fogParams[2] = fog.density || 0;
    }
    globalUniformGroup.update();
    this.renderer.ubo.updateUniformGroup(globalUniformGroup);
  }
};
extensions.add(ComputeSystemGpu, LightingSystemGpu, MipChainSystemGpu, MaterialSystemGpu, View3DPipeGpu);
export {
  ComputeSystemGpu,
  GPU_VISIBILITY_MIN,
  LightingSystemGpu,
  MaterialSystemGpu,
  MipChainSystemGpu,
  ShadowRenderPassGpu,
  View3DPipeGpu,
  buildWgslBindingMap,
  collectBindings,
  compileWgslSource,
  computeForwardBatchesGpu,
  createTexturesPluginGpu,
  emitBindingsWgsl,
  generateWgslStructAccessor,
  getGlobalGpuData,
  globalBitGpu,
  instanceAccessPlugin,
  materialTextureAccessPlugin,
  morphTargetBitGpu,
  morphTargetNormalBitGpu,
  prefixSlotName,
  prepareForwardBatchesGpu,
  produceCpuCompaction,
  produceVisibilityCompaction,
  renderForwardBatchesGpu,
  shadowBitsGpu,
  shadowGlobalBitGpu,
  skinningBitGpu,
  wgslAttributesPlugin,
  wgslBindingsPlugin,
  wgslFragmentOutputsPlugin,
  wgslHeadersPlugin,
  wgslInterStagePlugin,
  wgslOverridesPlugin,
  wgslStageSlotsPlugin
};
