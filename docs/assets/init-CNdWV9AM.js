import { aE as BufferImageSource, T as Texture, aF as uploadTexelRange, aG as DATA_TEXTURE_WIDTH, aH as glTexelAddress, a1 as resolveBindGroups, a2 as bindingFields, a3 as bindingType, a4 as RESOURCE_TYPES$1, a5 as isStorageType, a7 as isUniformBufferType, N as BindGroup, O as UINT_EMPTY, Q as DEPTH_EMPTY, V as CUBETEXTURE_EMPTY, W as MAX_SHADOW_SLOTS, E as ExtensionType, X as RenderPassBit, Y as CubeTexture, Z as writeHemisphere, _ as addLinearRgb, w as warn, a0 as capitalize, a8 as parseUniformBufferType, a9 as collectFragmentOutputs, aa as DEFAULT_OUTPUT_LOCATIONS, aI as UniformGroup, aJ as Matrix4, I as pipelineState, ah as assertBindGroups, S as Shader, ai as assertBitIdentity, aj as getMaterialLayout, ak as validateMaterialTextureSlots, al as validateMaterialStruct, am as MeshPassCache, an as NORMAL_MAP, ao as anisotropyTangentVariant, ap as srgbEncodeBit, aq as decodeToLinearBit, ar as addPassMaterialBits, as as ShaderDescriptor, au as getCameraData, aw as stateFor3D, ax as castsShadowThisFrame, ay as cascadeCountFor, aA as Rectangle, a as State, aK as CLEAR, aC as generateIblSpecialCubemap, v as Color, aD as writeLinearRgb, k as extensions } from "./index-DVREQIrz.js";
import { Y as ShadowDataStructGl, Z as LightStructGl, c as createGlobalUniformGroup, V as View3DGlobalData, S as SHADOW_TAPS, C as CASCADE_BLEND_FRACTION, _ as emitOverridesGlsl, d as collectOverrideDefs, f as collectSlotCode, g as getCachedTemplateSlots, l as layoutStructTexels, r as readsInstanceData, b as resolveInstanceAccess, i as instanceVaryingName, h as resolveShaderBits, j as compileShader, E as transformFrustumToBatch, m as materialBindingsBit, k as cameraBit, n as getPositionBit, o as materialStructPackPlugin, s as selectColorSpaceBit, p as getUvsBit, q as doubleSidedNormalBit, t as flatShadingBit, u as tangentNormalMappingBit, v as normalMappingBit, w as vertexColorBit, x as getMeshBillboardBit, y as alphaOpaqueBit, z as displayColorSpaceBit, A as noShadowBit, D as normalBit, I as ShadowRenderPassBase, $ as calculateDistancesFromStore, a0 as calculateDistancesFromWorldMatrix, M as MorphStoreBuffer, K as GeometryDataStoreBuffer, N as GeometryAtlasPool, O as View3DGCRegistry, P as MaterialDataStoreBuffer, Q as cachesDrawWork, T as ColorOutputDraw, U as generateBrdfLut, W as updateView3DScene, X as detectSharedCacheInvalidation } from "./View3DGlobalData-DAiChafy.js";
import "./RenderTexture-DsqSJlMc.js";
const WORDS_PER_INSTANCE = 1;
const NO_ROW = 4294967295;
var RenderInstanceTexture = class {
  /** Matches the GPU copy, which lets the compaction skip unchanged texels, so upload every texel you change */
  data;
  _source;
  _texture;
  _capacity = 0;
  constructor(initialCapacity = 256) {
    this.ensureCapacity(initialCapacity);
  }
  get texture() {
    return this._texture;
  }
  get capacity() {
    return this._capacity;
  }
  ensureCapacity(instances) {
    if (instances <= this._capacity) return;
    let capacity = Math.max(256, this._capacity);
    while (capacity < instances) capacity *= 2;
    this._capacity = capacity;
    const width = Math.min(capacity, DATA_TEXTURE_WIDTH);
    const height = Math.ceil(capacity / width);
    this.data = new Uint32Array(width * height * WORDS_PER_INSTANCE).fill(NO_ROW);
    if (!this._source) {
      this._source = new BufferImageSource({
        resource: this.data,
        width,
        height,
        format: "r32uint",
        scaleMode: "nearest",
        alphaMode: "no-premultiply-alpha",
        label: "InstanceIndex"
      });
      this._texture = new Texture({ source: this._source });
      return;
    }
    this._source.resource = this.data;
    if (this._source.width !== width || this._source.height !== height) this._source.resize(width, height);
  }
  upload(start, end) {
    if (start < end) uploadTexelRange(this._source, start, end);
  }
  unload() {
    this._source?.unload();
  }
  destroy() {
    if (!this._texture) return;
    this._texture.destroy(true);
    this._texture = null;
    this._source = null;
    this.data = null;
  }
};
const TEXELS_PER_ROW = 6;
const COMPONENT = [
  "x",
  "y",
  "z",
  "w"
];
const at = (lane) => ({
  texel: lane >> 2,
  component: COMPONENT[lane & 3]
});
const BONES = at(16);
const GEOMETRY = at(18);
const MORPH = at(20);
const MATERIAL = at(17);
function createInstanceFetchBitGl(material) {
  return {
    name: material ? "instanceFetchMaterial" : "instanceFetch",
    bindings: { global: {
      uMeshStoreTexture: "texture_2d<u32>",
      uRenderInstanceTexture: "texture_2d<u32>",
      batchTransform: { uBatchWorldMatrix: "mat4x4<f32>" }
    } },
    gl: { vertex: {
      header: `
      uniform int uInstanceBase;

      uvec4 fetchStoreTexel(int texel) {
        return texelFetch(uMeshStoreTexture, ${glTexelAddress("texel")}, 0);
      }
      `,
      input: `
      int instanceSlot = uInstanceBase + gl_InstanceID;
      uvec4 renderInstance = texelFetch(uRenderInstanceTexture, ${glTexelAddress("instanceSlot")}, 0);

      int storeTexel = int(renderInstance.x) * ${TEXELS_PER_ROW};

      modelMatrix = uBatchWorldMatrix * mat4(
        uintBitsToFloat(fetchStoreTexel(storeTexel)),
        uintBitsToFloat(fetchStoreTexel(storeTexel + 1)),
        uintBitsToFloat(fetchStoreTexel(storeTexel + 2)),
        uintBitsToFloat(fetchStoreTexel(storeTexel + 3)));

      uvec4 indexLanes = fetchStoreTexel(storeTexel + ${BONES.texel});
      float bonePitIndex = float(indexLanes.${BONES.component});
      vec2 morphData = vec2(
        float(fetchStoreTexel(storeTexel + ${MORPH.texel}).${MORPH.component}),
        float(int(indexLanes.${GEOMETRY.component})));
      ${material ? `vMaterialIndex = indexLanes.${MATERIAL.component};` : ""}
      `
    } }
  };
}
const instanceFetchBitGl = createInstanceFetchBitGl(false);
const instanceFetchMaterialBitGl = createInstanceFetchBitGl(true);
function generateGroupMap(bits, template2) {
  const groupData = /* @__PURE__ */ Object.create(null);
  const groups = resolveBindGroups(template2);
  for (const { name } of groups) groupData[name] = {
    resources: /* @__PURE__ */ Object.create(null),
    storages: /* @__PURE__ */ Object.create(null),
    uniformBuffers: /* @__PURE__ */ Object.create(null),
    uniformGroups: /* @__PURE__ */ Object.create(null)
  };
  for (const bit of bits) {
    if (!bit.bindings) continue;
    for (const [groupName, bindings] of Object.entries(bit.bindings)) {
      const group = groupData[groupName];
      if (!group) continue;
      for (const { name, spec, uniformGroup } of bindingFields(bindings, groupName)) {
        const type = bindingType(spec);
        if (RESOURCE_TYPES$1.has(type)) group.resources[name] = true;
        else if (isStorageType(type)) group.storages[name] = true;
        else if (isUniformBufferType(type)) group.uniformBuffers[name] = true;
        else group.uniformGroups[uniformGroup] = true;
      }
    }
  }
  const result = {};
  groups.forEach(({ name: groupName }, groupIndex) => {
    const group = groupData[groupName];
    const map = {};
    let bindingIndex = 0;
    if (group.uniformGroups[groupName]) map[bindingIndex++] = groupName;
    for (const name in group.resources) map[bindingIndex++] = name;
    for (const name in group.storages) map[bindingIndex++] = name;
    for (const name in group.uniformBuffers) map[bindingIndex++] = name;
    for (const name in group.uniformGroups) if (name !== groupName) map[bindingIndex++] = name;
    result[groupIndex] = map;
  });
  return result;
}
const globalBitGl = {
  name: "globalGl",
  structs: {
    Light: LightStructGl,
    ShadowData: ShadowDataStructGl
  },
  bindings: { global: {
    uGlobalLightParams: "vec4<f32>",
    uTime: "f32",
    uFogColor: "vec3<f32>",
    uDisplayExposure: "f32",
    uFogParams: "vec3<f32>",
    uExposure: "f32",
    uHemisphereSky: "vec3<f32>",
    uHemisphereGround: "vec3<f32>",
    uHemisphereUp: "vec3<f32>",
    uEnvironmentMaxMipLevel: "f32",
    uLightData: `array<vec4<f32>, 128>`,
    uShadowData: `array<vec4<f32>, ${MAX_SHADOW_SLOTS * 6}>`,
    uEnvironmentTexture: "texture_cube<f32>",
    uBrdfLutTexture: "texture_2d<f32>",
    uMaterialStorage: "texture_2d<u32>",
    uShadowMap: "texture_depth_2d_array",
    uBonePitTexture: "texture_2d<f32>",
    uOpaqueDepthTexture: "texture_2d<f32>",
    uOpaqueColorTexture: "texture_2d<f32>",
    uMorphTexture: "texture_2d<f32>",
    uGeometryTexture: "texture_2d<u32>"
  } },
  gl: { header: `
const float LIGHT_DIRECTIONAL = 0.0;
const float LIGHT_POINT = 1.0;
const float LIGHT_SPOT = 2.0;
` }
};
function createUniformsGl() {
  return { uEnvironmentMaxMipLevel: {
    value: 0,
    type: "f32"
  } };
}
function getGlobalGlData(view3d, renderer) {
  let data = view3d._gpuData[renderer.uid];
  if (!data) {
    const globalUniformGroupGl = createGlobalUniformGroup(view3d._lightDataList.data, view3d._shadowDataList.data, createUniformsGl());
    const group = new BindGroup({
      global: globalUniformGroupGl,
      uEnvironmentTexture: CUBETEXTURE_EMPTY.source,
      uBrdfLutTexture: Texture.EMPTY.source,
      uMaterialStorage: UINT_EMPTY.source,
      uShadowMap: DEPTH_EMPTY.source,
      uBonePitTexture: Texture.EMPTY.source,
      uOpaqueDepthTexture: Texture.EMPTY.source,
      uOpaqueColorTexture: Texture.EMPTY.source,
      uMorphTexture: Texture.EMPTY.source,
      uGeometryTexture: UINT_EMPTY.source,
      uMeshStoreTexture: UINT_EMPTY.source,
      uRenderInstanceTexture: UINT_EMPTY.source,
      batchTransform: renderer.material3d.batcher.batchTransform,
      uInstanceStoreTexture: UINT_EMPTY.source
    });
    data = new View3DGlobalData(globalUniformGroupGl, group, {
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
var LightingSystemGl = class {
  /** @ignore */
  static extension = {
    type: [ExtensionType.WebGLSystem],
    name: "lighting3d"
  };
  _renderer;
  constructor(renderer) {
    this._renderer = renderer;
  }
  /**
  * Runs the shadow pass's `beginFrame` every frame, then `prepareShadow` on each light before packing it, so the
  * light's shadow slot index is current when written
  */
  update(view3d, lights) {
    const shadowPass = view3d.passByBit[RenderPassBit.SHADOW];
    shadowPass?.beginFrame(view3d);
    const globalUniforms = getGlobalGlData(view3d, this._renderer).globalUniformGroup.uniforms;
    const globalLightParams = globalUniforms.uGlobalLightParams;
    globalLightParams[0] = 0;
    globalLightParams[1] = 0;
    globalLightParams[2] = 0;
    const environment = view3d.environment;
    if (environment !== null && !(environment instanceof CubeTexture)) writeHemisphere(environment, globalUniforms.uHemisphereSky, globalUniforms.uHemisphereGround, globalUniforms.uHemisphereUp);
    const lightDataList = view3d._lightDataList;
    lightDataList.reset();
    for (let i = 0; i < lights.length; i++) {
      const light = lights[i];
      if (!light._worldVisible) continue;
      if (light.type === "ambient") {
        addLinearRgb(globalLightParams, 0, light.color, light.intensity);
        continue;
      }
      if (lightDataList.count >= 32) continue;
      shadowPass?.prepareShadow(light, view3d);
      lightDataList.add(light);
    }
    globalLightParams[3] = lightDataList.count;
  }
};
function createMorphTargetBitGl(hasNormals) {
  const step = hasNormals ? " * 2" : "";
  return {
    name: hasNormals ? "morphTargetNormalGl" : "morphTargetGl",
    bindings: { global: {
      uMorphTexture: "texture_2d<f32>",
      uGeometryTexture: "texture_2d<u32>"
    } },
    gl: { vertex: {
      header: `
        vec4 fetchMorphTexel(int texel) {
          return texelFetch(uMorphTexture, ${glTexelAddress("texel")}, 0);
        }

        float fetchMorphWeight(int index) {
          return fetchMorphTexel(index >> 2)[index & 3];
        }

        uvec4 fetchGeometryMorphFacts(int geometryIndex) {
          int texel = geometryIndex * 2 + 1;
          return texelFetch(uGeometryTexture, ${glTexelAddress("texel")}, 0);
        }
      `,
      input: `
        if (morphData.x != 0.0) {
          uvec4 morphFacts = fetchGeometryMorphFacts(int(morphData.y));
          int morphTargetCount = int(morphFacts.y);
          int vidLocal = gl_VertexID - int(morphFacts.z);
          int morphDeltaTexel = int(morphFacts.x) / 4 + vidLocal * morphTargetCount${step};
          int morphWeightIndex = int(morphData.x);
          vec3 morphedPosition = position.xyz;${hasNormals ? "\n          vec3 morphedNormal = normal;" : ""}
          for (int morphIndex = 0; morphIndex < morphTargetCount; morphIndex++) {
            float morphWeight = fetchMorphWeight(morphWeightIndex + morphIndex);
            if (morphWeight != 0.0) {
              morphedPosition += fetchMorphTexel(morphDeltaTexel + morphIndex${step}).xyz * morphWeight;${hasNormals ? "\n              morphedNormal += fetchMorphTexel(morphDeltaTexel + morphIndex * 2 + 1).xyz * morphWeight;" : ""}
            }
          }
          position = vec4(morphedPosition, position.w);${hasNormals ? "\n          normal = normalize(morphedNormal);" : ""}
        }
      `
    } }
  };
}
const morphTargetBitGl = createMorphTargetBitGl(false);
const morphTargetNormalBitGl = createMorphTargetBitGl(true);
function fmt(n) {
  return Number.isInteger(n) ? `${n}.0` : `${n}`;
}
function pcfBody(taps) {
  const spread = taps.some(([x, y]) => x !== 0 || y !== 0);
  const tap = ([x, y]) => x === 0 && y === 0 ? "uv" : `uv + vec2(${fmt(x)}, ${fmt(y)}) * texelSize`;
  const lines = ["      float currentDepth = depth - params.x;"];
  if (spread) lines.push("      float texelSize = 1.0 / params.z;");
  lines.push("      float fl = float(layer);", "");
  if (taps.length === 1) lines.push(`      return texture(uShadowMap, vec4(${tap(taps[0])}, fl, currentDepth));`);
  else {
    const terms = taps.map((t) => `        texture(uShadowMap, vec4(${tap(t)}, fl, currentDepth))`).join(" +\n");
    lines.push(`      float shadow =
${terms};`, "", `      return shadow / ${fmt(taps.length)};`);
  }
  return lines.join("\n");
}
function createShadowBitGl(filter) {
  return {
    name: `shadowGl:${filter}`,
    structs: { ShadowData: ShadowDataStructGl },
    bindings: { global: {
      uShadowMap: "texture_depth_2d_array",
      uShadowData: `array<vec4<f32>, ${MAX_SHADOW_SLOTS * 6}>`
    } },
    gl: { header: `

    ShadowData getShadowData(int index) {
      int offset = index * 6;
      ShadowData sd;
      sd.lightSpaceMatrix = mat4(
        uShadowData[offset + 0],
        uShadowData[offset + 1],
        uShadowData[offset + 2],
        uShadowData[offset + 3]
      );
      sd.shadowParams = uShadowData[offset + 4];
      sd.cascadeSplits = uShadowData[offset + 5];
      return sd;
    }

    float sampleShadowLayer(int layer, mat4 lightSpaceMatrix, vec3 worldPos, vec3 normal, vec3 params, float NdotL) {
      vec3 biasedPos = worldPos + normal * (params.y * (1.0 - NdotL));
      vec4 lightSpacePos = lightSpaceMatrix * vec4(biasedPos, 1.0);
      vec3 projPos = lightSpacePos.xyz / lightSpacePos.w;

      vec2 uv = projPos.xy * 0.5 + 0.5;
      float depth = projPos.z * 0.5 + 0.5;

      vec3 uvd = vec3(uv, depth);
      if (any(notEqual(clamp(uvd, 0.0, 1.0), uvd))) {
        return 1.0;
      }

${pcfBody(SHADOW_TAPS[filter])}
    }

    float calculateShadow(
      Light light,
      vec3 worldPos,
      vec3 normal,
      float NdotL
    ) {
      int baseIndex = int(light.shadowDataIndex);

      if (baseIndex == -1) {
        return 1.0;
      }

      ShadowData base = getShadowData(baseIndex);
      int last = int(base.shadowParams.w) - 1;

      if (last < 1) {
        return sampleShadowLayer(baseIndex, base.lightSpaceMatrix, worldPos, normal, base.shadowParams.xyz, NdotL);
      }

      float viewDepth = -(uViewMatrix * vec4(worldPos, 1.0)).z;
      vec3 splits = base.cascadeSplits.xyz;

      vec3 crossed = step(splits, vec3(viewDepth));
      int cascadeIndex = int(min(dot(crossed, vec3(1.0)), float(last)));

      int idx = baseIndex + cascadeIndex;
      ShadowData sd = getShadowData(idx);
      float shadow = sampleShadowLayer(idx, sd.lightSpaceMatrix, worldPos, normal, sd.shadowParams.xyz, NdotL);

      if (cascadeIndex == last) {
        return shadow;
      }

      vec3 hot = vec3(float(cascadeIndex == 0), float(cascadeIndex == 1), float(cascadeIndex == 2));
      float splitFar = dot(splits, hot);
      float splitNear = dot(splits, vec3(hot.y, hot.z, 0.0));

      float band = max((splitFar - splitNear) * ${fmt(CASCADE_BLEND_FRACTION)}, 1e-4);
      float blend = clamp((viewDepth - splitFar + band) / band, 0.0, 1.0);

      if (blend <= 0.0) {
        return shadow;
      }

      ShadowData nd = getShadowData(idx + 1);
      float next = sampleShadowLayer(idx + 1, nd.lightSpaceMatrix, worldPos, normal, nd.shadowParams.xyz, NdotL);

      return mix(shadow, next, blend);
    }
  ` }
  };
}
const shadowBitsGl = {
  hard: createShadowBitGl("hard"),
  pcf: createShadowBitGl("pcf"),
  "pcf-high": createShadowBitGl("pcf-high")
};
const skinningBitGl = {
  name: "skinningGl",
  attributes: {
    aJoints: "uint8x4",
    aWeights: "float32x4"
  },
  bindings: { global: { uBonePitTexture: "texture_2d<f32>" } },
  gl: { vertex: {
    header: `
        void getBoneRows(uint jointIndex, uint bonePitIndex, out vec4 r0, out vec4 r1, out vec4 r2) {
          int baseTexel = int(bonePitIndex + jointIndex) * 3;

          r0 = texelFetch(uBonePitTexture, ${glTexelAddress("baseTexel")}, 0);
          r1 = texelFetch(uBonePitTexture, ${glTexelAddress("baseTexel + 1")}, 0);
          r2 = texelFetch(uBonePitTexture, ${glTexelAddress("baseTexel + 2")}, 0);
        }
      `,
    input: `
        vec4 skinRow0, skinRow1, skinRow2;
        vec4 b0, b1, b2;

        getBoneRows(uint(aJoints.x), uint(bonePitIndex), b0, b1, b2);
        skinRow0 = b0 * aWeights.x;
        skinRow1 = b1 * aWeights.x;
        skinRow2 = b2 * aWeights.x;

        getBoneRows(uint(aJoints.y), uint(bonePitIndex), b0, b1, b2);
        skinRow0 += b0 * aWeights.y;
        skinRow1 += b1 * aWeights.y;
        skinRow2 += b2 * aWeights.y;

        getBoneRows(uint(aJoints.z), uint(bonePitIndex), b0, b1, b2);
        skinRow0 += b0 * aWeights.z;
        skinRow1 += b1 * aWeights.z;
        skinRow2 += b2 * aWeights.z;

        getBoneRows(uint(aJoints.w), uint(bonePitIndex), b0, b1, b2);
        skinRow0 += b0 * aWeights.w;
        skinRow1 += b1 * aWeights.w;
        skinRow2 += b2 * aWeights.w;

        position = vec4(dot(skinRow0, position), dot(skinRow1, position), dot(skinRow2, position), position.w);
        normal = vec3(dot(skinRow0.xyz, normal), dot(skinRow1.xyz, normal), dot(skinRow2.xyz, normal));
        tangent = vec3(dot(skinRow0.xyz, tangent), dot(skinRow1.xyz, tangent), dot(skinRow2.xyz, tangent));
      `
  } }
};
const FORMAT_TO_GLSL = {
  float32: "float",
  float32x2: "vec2",
  float32x3: "vec3",
  float32x4: "vec4",
  sint32: "int",
  sint32x2: "ivec2",
  sint32x3: "ivec3",
  sint32x4: "ivec4",
  uint32: "uint",
  uint32x2: "uvec2",
  uint32x3: "uvec3",
  uint32x4: "uvec4",
  float16x2: "vec2",
  float16x4: "vec4",
  unorm8x2: "vec2",
  unorm8x4: "vec4",
  snorm8x2: "vec2",
  snorm8x4: "vec4",
  uint8x2: "uvec2",
  uint8x4: "uvec4",
  sint8x2: "ivec2",
  sint8x4: "ivec4",
  unorm16x2: "vec2",
  unorm16x4: "vec4",
  snorm16x2: "vec2",
  snorm16x4: "vec4",
  uint16x2: "uvec2",
  uint16x4: "uvec4",
  sint16x2: "ivec2",
  sint16x4: "ivec4"
};
function toGlslType$2(format) {
  const mapped = FORMAT_TO_GLSL[format];
  if (!mapped) {
    warn(`[compileAttributesGlsl] Unknown vertex format: "${format}"`);
    return "vec4";
  }
  return mapped;
}
function warnAttributeConflict(name, newFormat, existingFormat) {
  warn(`[compileAttributesGlsl] Attribute "${name}" redefined with different format: "${existingFormat}" → "${newFormat}". Keeping original.`);
}
function compileAttributesGlsl(bits, options = {}) {
  const { useLocations = true } = options;
  const attributes = /* @__PURE__ */ new Map();
  for (const bit of bits) {
    if (!bit.attributes) continue;
    for (const [name, format] of Object.entries(bit.attributes)) if (!attributes.has(name)) attributes.set(name, format);
    else if (attributes.get(name) !== format) warnAttributeConflict(name, format, attributes.get(name));
  }
  const out = [];
  let locationIndex = 0;
  for (const [name, format] of attributes) {
    const glslType = toGlslType$2(format);
    if (useLocations) out.push(`layout(location = ${locationIndex++}) in ${glslType} ${name};`);
    else out.push(`in ${glslType} ${name};`);
  }
  return out.join("\n");
}
const glslAttributesPlugin = {
  collectData(context) {
    if (context.stage === "vertex") {
      const glsl = context.data.glsl ??= {};
      glsl.attributes ??= compileAttributesGlsl(context.bits, { useLocations: context.glslOptions?.useLocations });
    }
  },
  injectCode(context) {
    if (context.stage === "vertex") return { header: context.data.glsl.attributes };
    return {};
  }
};
const WGSL_TO_GLSL_TYPE = {
  f32: "float",
  i32: "int",
  u32: "uint",
  "vec2<f32>": "vec2",
  "vec3<f32>": "vec3",
  "vec4<f32>": "vec4",
  "vec2<i32>": "ivec2",
  "vec3<i32>": "ivec3",
  "vec4<i32>": "ivec4",
  "vec2<u32>": "uvec2",
  "vec3<u32>": "uvec3",
  "vec4<u32>": "uvec4"
};
const WGSL_TO_GLSL_BINDING_TYPE = {
  ...WGSL_TO_GLSL_TYPE,
  bool: "bool",
  "mat2x2<f32>": "mat2",
  "mat3x3<f32>": "mat3",
  "mat4x4<f32>": "mat4",
  "mat2x3<f32>": "mat2x3",
  "mat2x4<f32>": "mat2x4",
  "mat3x2<f32>": "mat3x2",
  "mat3x4<f32>": "mat3x4",
  "mat4x2<f32>": "mat4x2",
  "mat4x3<f32>": "mat4x3",
  "texture_2d<f32>": "sampler2D",
  "texture_2d<u32>": "usampler2D",
  "texture_2d<i32>": "isampler2D",
  "texture_2d_array<f32>": "sampler2DArray",
  "texture_3d<f32>": "sampler3D",
  "texture_cube<f32>": "samplerCube",
  texture_depth_2d: "sampler2DShadow",
  texture_depth_2d_array: "sampler2DArrayShadow",
  texture_depth_cube: "samplerCubeShadow",
  texture_depth_cube_array: "samplerCubeArrayShadow",
  sampler: "",
  sampler_comparison: ""
};
function parseArrayType(wgslType) {
  const match = wgslType.match(/^array<(.+),\s*(\d+)>$/);
  if (!match) return null;
  return {
    baseType: match[1],
    size: match[2]
  };
}
function toGlslType$1(wgslType) {
  const arrayInfo = parseArrayType(wgslType);
  if (arrayInfo) {
    const baseGlsl = WGSL_TO_GLSL_BINDING_TYPE[arrayInfo.baseType] ?? arrayInfo.baseType;
    if (!baseGlsl) return null;
    return {
      glslType: baseGlsl,
      arraySize: arrayInfo.size
    };
  }
  const mapped = WGSL_TO_GLSL_BINDING_TYPE[wgslType];
  if (mapped !== void 0) return mapped || null;
  return wgslType;
}
const RESOURCE_TYPES = /* @__PURE__ */ new Set([
  "sampler2D",
  "usampler2D",
  "isampler2D",
  "sampler2DArray",
  "sampler3D",
  "samplerCube",
  "sampler2DShadow",
  "sampler2DArrayShadow",
  "samplerCubeShadow",
  "samplerCubeArrayShadow"
]);
function uniformBlockInstanceName(bindingName) {
  return `u${capitalize(bindingName)}`;
}
function mat2ColumnMember(name, column) {
  return `${name}_${column}`;
}
function fitsBufferBlock(wgslType) {
  const array = parseArrayType(wgslType);
  const base = array ? array.baseType : wgslType;
  if (/^mat[234]x2</.test(base)) return !array && base === "mat2x2<f32>";
  return !array || base.startsWith("vec4") || base.startsWith("mat");
}
function toGlslTypeSimple(wgslType) {
  const mapped = WGSL_TO_GLSL_BINDING_TYPE[wgslType];
  if (mapped !== void 0) return mapped || wgslType;
  return wgslType;
}
function warnBindingConflict(name, newType, existingType) {
  warn(`[collectBindingsGlsl] Binding "${name}" redefined with different type: "${existingType}" → "${newType}". Keeping original.`);
}
function collectBindingsGlsl(bits, template2) {
  const groups = resolveBindGroups(template2);
  const bindGroups = /* @__PURE__ */ Object.create(null);
  for (const { name } of groups) bindGroups[name] = {
    uniformGroups: /* @__PURE__ */ Object.create(null),
    resources: /* @__PURE__ */ Object.create(null),
    uniformBuffers: /* @__PURE__ */ Object.create(null)
  };
  const structs = /* @__PURE__ */ Object.create(null);
  for (const bit of bits) {
    if (!bit.structs) continue;
    for (const [structName, structDef] of Object.entries(bit.structs)) if (!(structName in structs)) structs[structName] = structDef;
  }
  for (const bit of bits) {
    if (!bit.bindings) continue;
    for (const [groupName, bindings] of Object.entries(bit.bindings)) {
      if (!bindings) continue;
      const structName = capitalize(groupName);
      const isBound = groupName in bindGroups;
      for (const { name, spec, uniformGroup: fieldGroup } of bindingFields(bindings, groupName)) {
        const wgslType = bindingType(spec);
        if (isStorageType(wgslType)) continue;
        if (isUniformBufferType(wgslType)) {
          if (!isBound) continue;
          const bufferStruct = parseUniformBufferType(wgslType);
          if (!bufferStruct) {
            warn(`[collectBindingsGlsl] Bit "${bit.name}" binding "${name}" has invalid uniform buffer type: "${wgslType}". Expected format: uniform<StructName>`);
            continue;
          }
          const buffers = bindGroups[groupName].uniformBuffers;
          if (!(name in buffers)) {
            buffers[name] = bufferStruct;
            structs[bufferStruct] ??= {};
          } else if (buffers[name] !== bufferStruct) warnBindingConflict(name, bufferStruct, buffers[name]);
          continue;
        }
        const glslResult = toGlslType$1(wgslType);
        if (!glslResult) continue;
        const isArrayType = typeof glslResult === "object";
        const glslType = isArrayType ? glslResult.glslType : glslResult;
        const arraySize = isArrayType ? glslResult.arraySize : void 0;
        if (RESOURCE_TYPES.has(glslType)) {
          if (isBound) {
            const res = bindGroups[groupName].resources;
            if (!(name in res)) res[name] = glslType;
            else if (res[name] !== glslType) warnBindingConflict(name, glslType, res[name]);
          }
        } else {
          const uniformGroup = isBound ? fieldGroup : groupName;
          if (isBound) {
            const unis = bindGroups[groupName].uniformGroups[uniformGroup] ??= /* @__PURE__ */ Object.create(null);
            if (!(name in unis)) unis[name] = {
              glslType,
              arraySize
            };
          }
          if (uniformGroup !== groupName) continue;
          if (!(structName in structs)) structs[structName] = {};
          const structDef = structs[structName];
          if (structDef[name] && structDef[name] !== wgslType) warnBindingConflict(name, wgslType, structDef[name]);
          else structDef[name] = wgslType;
        }
      }
    }
  }
  return {
    groups,
    bindGroups,
    structs
  };
}
function formatBlockMember(blockName, name, wgslType) {
  if (!fitsBufferBlock(wgslType)) throw new Error(`[emitBindingsGlsl] Field "${name}" of uniform block "${blockName}" is "${wgslType}", which std140 lays out differently from WGSL. A buffer-backed block takes scalars, vectors, mat2x2<f32>, matrices of vec3 or vec4 columns, and arrays of 16-byte elements.`);
  if (wgslType === "mat2x2<f32>") return [`  vec2 ${mat2ColumnMember(name, 0)};`, `  vec2 ${mat2ColumnMember(name, 1)};`];
  const glsl = toGlslType$1(wgslType);
  return [`  ${formatUniform(name, typeof glsl === "object" ? glsl : { glslType: glsl })};`];
}
function formatUniform(name, entry) {
  if (entry.arraySize) return `${entry.glslType} ${name}[${entry.arraySize}]`;
  return `${entry.glslType} ${name}`;
}
function emitBindingsGlsl(collected, structs) {
  const { groups, bindGroups } = collected;
  for (const groupName in bindGroups) {
    const { uniformBuffers } = bindGroups[groupName];
    for (const name in uniformBuffers) {
      const structName = uniformBuffers[name];
      if (Object.keys(structs[structName] ?? {}).length === 0) throw new Error(`[emitBindingsGlsl] Binding "${name}" is "uniform<${structName}>", but no bit declares fields for a "${structName}" struct.`);
    }
  }
  const out = [];
  for (const structName in structs) {
    const groupName = structName.charAt(0).toLowerCase() + structName.slice(1);
    if (bindGroups[groupName]?.uniformGroups[groupName]) continue;
    const structDef = structs[structName];
    out.push(`struct ${structName} {`);
    for (const [fieldName, fieldType] of Object.entries(structDef)) out.push(`  ${toGlslTypeSimple(fieldType)} ${fieldName};`);
    out.push("};");
  }
  for (const { name: groupName, ubo } of groups) {
    const group = bindGroups[groupName];
    const own = group.uniformGroups[groupName];
    if (own && ubo) {
      out.push(`layout(std140) uniform ${groupName} {`);
      for (const name in own) out.push(`  ${formatUniform(name, own[name])};`);
      out.push("};");
    } else if (own) for (const name in own) out.push(`uniform ${formatUniform(name, own[name])};`);
    for (const name in group.resources) out.push(`uniform ${group.resources[name]} ${name};`);
    for (const name in group.uniformBuffers) {
      const structDef = structs[group.uniformBuffers[name]];
      out.push(`layout(std140) uniform ${name} {`);
      for (const field in structDef) out.push(...formatBlockMember(name, field, structDef[field]));
      out.push(`} ${uniformBlockInstanceName(name)};`);
    }
    for (const uniformGroup in group.uniformGroups) {
      if (uniformGroup === groupName) continue;
      const fields = group.uniformGroups[uniformGroup];
      for (const name in fields) out.push(`uniform ${formatUniform(name, fields[name])};`);
    }
  }
  return out.join("\n");
}
const glslBindingsPlugin = {
  collectData(context) {
    const glsl = context.data.glsl ??= {};
    if (glsl.bindingGroups === void 0) {
      glsl.bindingGroups = collectBindingsGlsl(context.bits, context.template);
      context.data.structs = glsl.bindingGroups.structs;
    }
  },
  injectCode(context) {
    const glsl = context.data.glsl;
    glsl.bindings ??= emitBindingsGlsl(glsl.bindingGroups, context.data.structs);
    return { header: glsl.bindings };
  }
};
const WRITE_SLOT = "{{writeOutputs}}";
function outName(name) {
  return `frag${name[0].toUpperCase()}${name.slice(1)}`;
}
function emitDeclarations(declared, locations) {
  const out = ["struct Outputs {"];
  for (const name in declared) out.push(`  ${WGSL_TO_GLSL_TYPE[declared[name]]} ${name};`);
  out.push("};", "");
  for (let i = 0; i < locations.length; i++) {
    if (!declared[locations[i]]) continue;
    out.push(`layout(location = ${i}) out ${WGSL_TO_GLSL_TYPE[declared[locations[i]]]} ${outName(locations[i])};`);
  }
  return out.join("\n");
}
const glslFragmentOutputsPlugin = {
  collectData(context) {
    if (!context.templateString.includes(WRITE_SLOT)) return;
    context.data.outputs = collectFragmentOutputs(context.bits);
  },
  injectCode(context) {
    const declared = context.data.outputs;
    if (!declared) return {};
    const locations = context.outputLocations;
    const zeros = [];
    const writes = [];
    for (const name in declared) zeros.push(`${WGSL_TO_GLSL_TYPE[declared[name]]}(0)`);
    for (let i = 0; i < locations.length; i++) if (declared[locations[i]]) writes.push(`${outName(locations[i])} = outputs.${locations[i]};`);
    return {
      header: emitDeclarations(declared, locations),
      declareOutputs: `Outputs outputs = Outputs(${zeros.join(", ")});`,
      writeOutputs: writes.join("\n")
    };
  }
};
const glslGroupMapPlugin = { collectData(context) {
  if (!context.data.groupMap) context.data.groupMap = generateGroupMap(context.bits, context.template);
} };
const glslHeadersPlugin = {
  collectData(context) {
    if (!context.data.headers) context.data.headers = context.bits.map((bit) => bit.gl?.header).filter((h) => !!(h && /\S/.test(h)));
  },
  injectCode(context) {
    return { header: context.data.headers.join("\n") };
  }
};
const BUILTIN_NAMES = /* @__PURE__ */ new Set([
  "position",
  "frontFacing",
  "sampleIndex",
  "sampleMask"
]);
function needsFlatQualifier(type) {
  return type === "i32" || type === "u32" || type.includes("<i32>") || type.includes("<u32>");
}
function toGlslType(interStageType) {
  const mapped = WGSL_TO_GLSL_TYPE[interStageType];
  if (!mapped) {
    warn(`[compileInterStageGlsl] Unknown inter-stage type: "${interStageType}"`);
    return "vec4";
  }
  return mapped;
}
function warnInterStageConflict(name, newType, existingType) {
  warn(`[compileInterStageGlsl] Inter-stage variable "${name}" redefined with different type: "${existingType}" → "${newType}". Keeping original.`);
}
function compileInterStageGlsl(bits, options = {}) {
  const { useLocations = true } = options;
  const interStage = /* @__PURE__ */ new Map();
  for (const bit of bits) {
    if (!bit.interStage) continue;
    for (const [name, type] of Object.entries(bit.interStage)) {
      if (BUILTIN_NAMES.has(name)) continue;
      if (!interStage.has(name)) interStage.set(name, type);
      else if (interStage.get(name) !== type) warnInterStageConflict(name, type, interStage.get(name));
    }
  }
  const vertexOut = [];
  let locationIndex = 0;
  for (const [name, type] of interStage) {
    const glslType = toGlslType(type);
    const flat = needsFlatQualifier(type) ? "flat " : "";
    if (useLocations) vertexOut.push(`layout(location = ${locationIndex++}) ${flat}out ${glslType} ${name};`);
    else vertexOut.push(`${flat}out ${glslType} ${name};`);
  }
  const fragmentIn = [];
  locationIndex = 0;
  for (const [name, type] of interStage) {
    const glslType = toGlslType(type);
    const flat = needsFlatQualifier(type) ? "flat " : "";
    if (useLocations) fragmentIn.push(`layout(location = ${locationIndex++}) ${flat}in ${glslType} ${name};`);
    else fragmentIn.push(`${flat}in ${glslType} ${name};`);
  }
  return {
    vertex: vertexOut.join("\n"),
    fragment: fragmentIn.join("\n")
  };
}
const glslInterStagePlugin = {
  collectData(context) {
    const glsl = context.data.glsl ??= {};
    glsl.interStage ??= compileInterStageGlsl(context.bits, { useLocations: context.glslOptions?.useLocations });
  },
  injectCode(context) {
    const interStage = context.data.glsl.interStage;
    return { header: context.stage === "vertex" ? interStage.vertex : interStage.fragment };
  }
};
const glslOverridesPlugin = {
  collectData(context) {
    context.data.overrides = collectOverrideDefs(context.bits);
  },
  injectCode(context) {
    const values = context.glslOptions?.overrides ?? {};
    return { header: emitOverridesGlsl(context.data.overrides, values) };
  }
};
const VERSION_LINE = "#version 300 es";
const GLSL_PRECISION_PRELUDE = `precision highp float;
precision highp int;
precision highp sampler2D;
precision highp usampler2D;
precision highp isampler2D;
precision highp sampler3D;
precision highp samplerCube;
precision highp sampler2DArray;
precision highp sampler2DShadow;
precision highp samplerCubeShadow;
precision highp sampler2DArrayShadow;`;
const glslPrecisionPlugin = { preCompile(context) {
  const { templateString } = context;
  if (!templateString.includes(VERSION_LINE)) {
    warn(`[compileShader] ${context.stage === "vertex" ? "Vertex" : "Fragment"} template has no '${VERSION_LINE}' line - highp precision will not be declared.`);
    return;
  }
  context.templateString = templateString.replace(VERSION_LINE, `${VERSION_LINE}
${GLSL_PRECISION_PRELUDE}`);
} };
const NESTED_MARKER_PATTERN = /\{\{(.*?)\}\}/g;
function collectIndirectSlots(slotCode) {
  const indirect = /* @__PURE__ */ new Set();
  for (const codes of Object.values(slotCode)) for (const code of codes) {
    if (!code) continue;
    for (const match of code.matchAll(NESTED_MARKER_PATTERN)) indirect.add(match[1]);
  }
  return indirect;
}
function warnUnusedSlots(templateSource, slotCode, stage) {
  const templateSlots = getCachedTemplateSlots(templateSource);
  const indirectSlots = collectIndirectSlots(slotCode);
  for (const [slotName, codes] of Object.entries(slotCode)) if (codes.some((c) => c && /\S/.test(c)) && !templateSlots.has(slotName) && !indirectSlots.has(slotName)) warn(`[compileShader] ${stage === "vertex" ? "Vertex" : "Fragment"} generated code for slot {{${slotName}}} but template doesn't have it.`);
}
const glslStageSlotsPlugin = { injectCode(context) {
  if (!context.stage) return {};
  const slotCode = collectSlotCode(context.bits, "gl", context.stage);
  const result = {};
  for (const [slotName, code] of Object.entries(slotCode)) result[slotName] = code.join("\n");
  const checkRecord = {};
  for (const [k, v] of Object.entries(result)) checkRecord[k] = [v];
  warnUnusedSlots(context.templateString, checkRecord, context.stage);
  return result;
} };
function glslFieldValue(entry, texel) {
  if (entry.type === "mat2x2<f32>") return `mat2(uintBitsToFloat(${texel}.xy), uintBitsToFloat(${texel}.zw))`;
  const bits = `${texel}${entry.swizzle}`;
  if (entry.scalar === "u32") return bits;
  if (entry.scalar === "i32") return `${entry.type === "vec4<i32>" ? "ivec4" : "int"}(${bits})`;
  return `uintBitsToFloat(${bits})`;
}
function generateGlslStructAccessor(options) {
  const lines = [];
  lines.push(`${options.struct} ${options.name}(uint index) {`);
  lines.push(`  int base = ${options.base};`);
  lines.push(`  ${options.struct} m;`);
  for (const [texelIdx, entries] of layoutStructTexels(options.fields, options.read)) {
    lines.push(`  uvec4 t${texelIdx} = ${options.load(`base + ${texelIdx}`)};`);
    for (const entry of entries) lines.push(`  m.${entry.name} = ${glslFieldValue(entry, `t${texelIdx}`)};`);
  }
  lines.push(`  return m;`);
  lines.push(`}`);
  return lines.join("\n");
}
function createInstanceAccessBitGl(access) {
  const { layout, loaded, varyings } = access;
  const interStage = {};
  const vertex = ["Instance instance = getInstance(renderInstance.x);"];
  const fragment = ["Instance instance;"];
  for (const name of varyings) {
    const type = layout.struct[name];
    const varying = instanceVaryingName(name);
    const asBits = type === "vec4<f32>" ? `floatBitsToUint(instance.${name})` : type === "vec4<i32>" ? `uvec4(instance.${name})` : `instance.${name}`;
    const fromBits = type === "vec4<f32>" ? `uintBitsToFloat(${varying})` : type === "vec4<i32>" ? `ivec4(${varying})` : varying;
    interStage[varying] = "vec4<u32>";
    vertex.push(`${varying} = ${asBits};`);
    fragment.push(`instance.${name} = ${fromBits};`);
  }
  return {
    name: `instanceAccess:${layout.key}`,
    interStage,
    bindings: { global: { uInstanceStoreTexture: "texture_2d<u32>" } },
    gl: {
      vertex: {
        header: generateGlslStructAccessor({
          name: "getInstance",
          struct: "Instance",
          fields: layout.struct,
          read: loaded,
          base: `int(index) * ${layout.stride / 4}`,
          load: (texel) => `texelFetch(uInstanceStoreTexture, ${glTexelAddress(texel)}, 0)`
        }),
        storeAccess: vertex.join("\n  ")
      },
      fragment: varyings.length ? { storeAccess: fragment.join("\n  ") } : void 0
    }
  };
}
const instanceAccessPluginGl = { collectData(context) {
  if (!readsInstanceData(context.bits)) return;
  const access = resolveInstanceAccess(context.bits, "gl", context.instanceLayout, context.template);
  context.bits = [...context.bits, createInstanceAccessBitGl(access)];
} };
function warnMissingHeaderSlot(templateSource, headerSource, stage) {
  if (headerSource && /\S/.test(headerSource) && !templateSource.includes("{{header}}")) warn(`[compileShader] ${stage === "vertex" ? "Vertex" : "Fragment"} template missing {{header}} slot - bindings, attributes, and inter-stage variables will not be injected.`);
}
function compileGlslSource(options) {
  const { bits, template: template2, extraPlugins, instanceLayout, outputLocations = DEFAULT_OUTPUT_LOCATIONS, ...glslOptions } = options;
  const resolvedBits = resolveShaderBits(bits);
  const defaultPlugins = [
    instanceAccessPluginGl,
    glslPrecisionPlugin,
    glslGroupMapPlugin,
    glslOverridesPlugin,
    glslBindingsPlugin,
    glslInterStagePlugin,
    glslFragmentOutputsPlugin,
    glslAttributesPlugin,
    glslHeadersPlugin,
    glslStageSlotsPlugin
  ];
  const plugins = extraPlugins ? [...extraPlugins, ...defaultPlugins] : defaultPlugins;
  const vertexContext = {
    bits: resolvedBits,
    template: template2,
    templateString: template2.gl.vertex,
    data: {},
    stage: "vertex",
    glslOptions,
    instanceLayout,
    outputLocations
  };
  const vertex = compileShader(vertexContext, plugins);
  warnMissingHeaderSlot(template2.gl.vertex, vertexContext.data.headers.join(""), "vertex");
  const fragmentContext = {
    bits: resolvedBits,
    template: template2,
    templateString: template2.gl.fragment,
    data: vertexContext.data,
    stage: "fragment",
    glslOptions,
    instanceLayout,
    outputLocations
  };
  const fragment = compileShader(fragmentContext, plugins);
  warnMissingHeaderSlot(template2.gl.fragment, fragmentContext.data.headers.join(""), "fragment");
  return {
    vertex,
    fragment,
    structs: fragmentContext.data.structs ?? {},
    groupMap: fragmentContext.data.groupMap,
    bits: fragmentContext.bits
  };
}
function generateGlslMaterialAccessor(fields) {
  return generateGlslStructAccessor({
    name: "getMaterial",
    struct: "Material",
    fields,
    base: "int(index)",
    load: (texel) => `texelFetch(uMaterialStorage, ${glTexelAddress(texel)}, 0)`
  });
}
const materialTextureAccessPluginGl = { injectCode(context) {
  const material = context.data.structs?.Material;
  if (!material) return {};
  return {
    textureGetters: generateGlslMaterialAccessor(material),
    storeAccess: "Material material = getMaterial(vMaterialIndex);"
  };
} };
const BLOCK = uniformBlockInstanceName("material");
function generateGlslMaterialUniformAccessor(fields) {
  const lines = [`Material getMaterial() {`, `  Material m;`];
  for (const name in fields) {
    const value = fields[name] === "mat2x2<f32>" ? `mat2(${BLOCK}.${mat2ColumnMember(name, 0)}, ${BLOCK}.${mat2ColumnMember(name, 1)})` : `${BLOCK}.${name}`;
    lines.push(`  m.${name} = ${value};`);
  }
  lines.push(`  return m;`, `}`);
  return lines.join("\n");
}
const materialUniformAccessPluginGl = { injectCode(context) {
  const material = context.data.structs?.Material;
  if (!material) return {};
  return {
    textureGetters: generateGlslMaterialUniformAccessor(material),
    storeAccess: "Material material = getMaterial();"
  };
} };
const noAlloc = {
  atlas: null,
  indexCount: void 0,
  firstIndex: void 0
};
const _noPlanes = /* @__PURE__ */ new Float32Array(24);
var Mesh3DBatcherGl = class {
  /**
  * The group `instanceFetchBitGl` declares, shared by every batch and set by each `draw`: pixi re-uploads a static
  * group to a program only when it changed since that program read it, so per-batch groups could draw a stale matrix
  */
  batchTransform = new UniformGroup({ uBatchWorldMatrix: {
    value: new Matrix4(),
    type: "mat4x4<f32>"
  } }, {
    isStatic: true,
    ubo: false
  });
  /**
  * Parks `lastVisibilityDirtyId` at -1, which no dirty id matches, so the next draw compacts the new index
  * @returns The number of instances written
  */
  build(options) {
    const { renderables, list, globalBindGroup, passBit, bindsMaterial } = options;
    const len = renderables.count;
    const commandList = list.commandList;
    if (len === 0) return 0;
    commandList.clear();
    this._ensureCapacity(list, len);
    const indices = renderables.indices;
    const items = renderables.items;
    const glData = list.glData;
    const index = glData.indexStaging;
    let r = items[indices[0]];
    let cache = r._passCache[passBit];
    let currentShader = cache.shader;
    let currentBatchKey = cache.batchKey;
    let currentGeometry = r.geometry;
    let currentState = pipelineState(currentBatchKey, cache.state);
    let currentTopology = cache.topology;
    let currentMaterial = r.material;
    let currentAlloc = currentGeometry._geometryAtlasAllocation || noAlloc;
    let geometry = currentAlloc.atlas ? currentAlloc.atlas.geometry : currentGeometry;
    let drawStart = currentAlloc.firstIndex;
    let drawSize = currentAlloc.indexCount;
    let batchStart = 0;
    let runFirstMaterial = currentMaterial;
    if (bindsMaterial) commandList.captureMaterialTextures(currentMaterial);
    index[0] = r._storeIndex;
    for (let i = 1; i < len; i++) {
      r = items[indices[i]];
      cache = r._passCache[passBit];
      index[i] = r._storeIndex;
      const m = r.material;
      const keyChanged = cache.batchKey !== currentBatchKey;
      if (!keyChanged && (!bindsMaterial || m === currentMaterial)) continue;
      if (!keyChanged && currentMaterial._textureSetId === m._textureSetId) {
        currentMaterial = m;
        continue;
      }
      this._recordCommand(commandList, list.drawData, globalBindGroup, bindsMaterial ? runFirstMaterial._getMergedBindGroup() : void 0, currentShader, currentState, geometry, drawStart, drawSize, batchStart, i - batchStart, currentTopology, currentBatchKey, bindsMaterial ? runFirstMaterial._textureSetId : 0, bindsMaterial);
      batchStart = i;
      const materialChanged = m !== currentMaterial;
      currentMaterial = m;
      if (keyChanged) {
        currentBatchKey = cache.batchKey;
        currentGeometry = r.geometry;
        currentShader = cache.shader;
        currentState = pipelineState(currentBatchKey, cache.state);
        currentTopology = cache.topology;
        currentAlloc = currentGeometry._geometryAtlasAllocation || noAlloc;
        geometry = currentAlloc.atlas ? currentAlloc.atlas.geometry : currentGeometry;
        drawStart = currentAlloc.firstIndex;
        drawSize = currentAlloc.indexCount;
      }
      runFirstMaterial = m;
      if (bindsMaterial && materialChanged) commandList.captureMaterialTextures(m);
    }
    this._recordCommand(commandList, list.drawData, globalBindGroup, bindsMaterial ? runFirstMaterial._getMergedBindGroup() : void 0, currentShader, currentState, geometry, drawStart, drawSize, batchStart, len - batchStart, currentTopology, currentBatchKey, bindsMaterial ? runFirstMaterial._textureSetId : 0, bindsMaterial);
    commandList.endBuild();
    glData.lastVisibilityDirtyId = -1;
    return len;
  }
  /**
  * Frustum culling compacts every draw, since the camera has no change signal; otherwise only a rebuild or a
  * visibility change does. Skips a command with no indices, which pixi would draw as the whole index buffer.
  */
  draw(renderer, list, batch, cullFrustum, camera) {
    const indexTexture = list.glData.indexTexture;
    if (!indexTexture) return;
    const frustumCull = cullFrustum !== null && batch.cull !== "off";
    if (frustumCull || list.glData.lastVisibilityDirtyId !== batch._visibilityDirtyId) this._compact(list, batch, frustumCull ? cullFrustum : null, indexTexture);
    this.batchTransform.uniforms.uBatchWorldMatrix = batch.renderData.worldTransform;
    this.batchTransform.update();
    const gl = renderer.gl;
    const shaderSys = renderer.shader;
    const geoSys = renderer.geometry;
    const stateSys = renderer.state;
    const commandList = list.commandList;
    const commandCount = commandList.count;
    const drawCalls = list.drawData.drawCalls;
    for (let i = 0; i < commandCount; i++) {
      const b = i * 5;
      if (drawCalls[b + 1] === 0 || drawCalls[b] === 0) continue;
      const cmd = commandList.commands[i];
      cmd.shader.groups[0] = cmd.globalBindGroup;
      cmd.shader.groups[1] = camera.bindGroup;
      if (cmd.batchBindGroup) cmd.shader.groups[2] = cmd.batchBindGroup;
      shaderSys.bind(cmd.shader);
      geoSys.bind(cmd.geometry, shaderSys._activeProgram);
      if (cmd.state) stateSys.set(cmd.state);
      const location = shaderSys._getProgramData(shaderSys._activeProgram).uniformData.uInstanceBase?.location;
      if (location !== void 0) gl.uniform1i(location, drawCalls[b + 4]);
      geoSys.draw(cmd.topology, drawCalls[b], drawCalls[b + 2], drawCalls[b + 1]);
    }
  }
  /**
  * Survivors pack from each command's `firstInstance`, which never moves, since it also bounds the command's staging
  * range. Writes only texels that differ from `indexTexture.data`, which mirrors the GPU copy, and uploads their span.
  */
  _compact(list, batch, cullFrustum, indexTexture) {
    const glData = list.glData;
    const commandCount = list.commandList.count;
    const drawCalls = list.drawData.drawCalls;
    const totalInstances = list.view.count;
    const visible = batch.storeBuffer.visible;
    if (cullFrustum !== null) batch._ensureSpheres();
    const spheres = batch.storeBuffer.boundingSpheres;
    const src = glData.indexStaging;
    const dst = indexTexture.data;
    const planes = cullFrustum !== null ? transformFrustumToBatch(cullFrustum.planesData, batch.storeBuffer.data) : null;
    const tp = planes ?? _noPlanes;
    let changedStart = totalInstances;
    let changedEnd = 0;
    for (let k = 0; k < commandCount; k++) {
      const start = drawCalls[k * 5 + 4];
      const end = k + 1 < commandCount ? drawCalls[(k + 1) * 5 + 4] : totalInstances;
      let w = start;
      for (let i = start; i < end; i++) {
        const id = src[i];
        if (visible[id] === 0) continue;
        if (planes !== null) {
          const so = id * 4;
          const radius = spheres[so + 3];
          if (radius >= 0) {
            const cx = spheres[so];
            const cy = spheres[so + 1];
            const cz = spheres[so + 2];
            if (tp[0] * cx + tp[1] * cy + tp[2] * cz + tp[3] < -radius || tp[4] * cx + tp[5] * cy + tp[6] * cz + tp[7] < -radius || tp[8] * cx + tp[9] * cy + tp[10] * cz + tp[11] < -radius || tp[12] * cx + tp[13] * cy + tp[14] * cz + tp[15] < -radius || tp[16] * cx + tp[17] * cy + tp[18] * cz + tp[19] < -radius || tp[20] * cx + tp[21] * cy + tp[22] * cz + tp[23] < -radius) continue;
          }
        }
        if (dst[w] !== id) {
          dst[w] = id;
          if (w < changedStart) changedStart = w;
          changedEnd = w + 1;
        }
        w++;
      }
      drawCalls[k * 5 + 1] = w - start;
    }
    indexTexture.upload(changedStart, changedEnd);
    list.glData.lastVisibilityDirtyId = batch._visibilityDirtyId;
  }
  /** Drops the records on growth, so only `build`, which rewrites every one, may call it */
  _ensureCapacity(list, needed) {
    const glData = list.glData;
    const indexTexture = glData.indexTexture ??= new RenderInstanceTexture(Math.max(256, needed));
    indexTexture.ensureCapacity(needed);
    if (!glData.indexStaging || glData.indexStaging.length < indexTexture.data.length) glData.indexStaging = new Uint32Array(indexTexture.data.length);
  }
  _recordCommand(commandList, drawData, globalBindGroup, bindGroup, shader, state, geometry, drawStart, drawSize, firstInstance, instanceCount, topology, batchKey, textureSetId, merged) {
    const cmd = commandList.next();
    cmd.geometry = geometry;
    cmd.shader = shader;
    cmd.globalBindGroup = globalBindGroup;
    cmd.batchBindGroup = bindGroup;
    cmd.state = state;
    cmd.topology = topology;
    cmd.batchKey = batchKey;
    cmd.textureSetId = textureSetId;
    cmd.merged = merged;
    commandList.captureGeometry(geometry);
    const offset = (commandList.count - 1) * 5;
    const drawCalls = drawData.ensureCapacity(commandList.count);
    drawCalls[offset] = drawSize ?? (geometry.indexCount || geometry.indexBuffer.data.length);
    drawCalls[offset + 1] = instanceCount;
    drawCalls[offset + 2] = drawStart ?? 0;
    drawCalls[offset + 3] = 0;
    drawCalls[offset + 4] = firstInstance;
  }
};
const OFFSET_BITS = 256;
const TOPOLOGY_BITS = 8;
const BLEND_BITS = 32;
const GL_STATE_KEY_RANGE = 256 * BLEND_BITS * TOPOLOGY_BITS * OFFSET_BITS;
const TOPOLOGY_IDS = {
  "point-list": 0,
  "line-list": 1,
  "line-strip": 2,
  "triangle-list": 3,
  "triangle-strip": 4
};
const offsetIds = /* @__PURE__ */ new Map();
let nextOffsetId = 0;
function getOrAllocateOffsetId(offset) {
  let id = offsetIds.get(offset);
  if (id === void 0) {
    id = nextOffsetId++;
    offsetIds.set(offset, id);
  }
  return id;
}
function packGlBatchKey(shaderUid, state, topology) {
  const stateKey = ((state.data * BLEND_BITS + state._blendModeId) * TOPOLOGY_BITS + TOPOLOGY_IDS[topology]) * OFFSET_BITS + getOrAllocateOffsetId(state.polygonOffset);
  return shaderUid * GL_STATE_KEY_RANGE + stateKey;
}
function textureGetters(funcName, index, isFragment) {
  const lines = [
    `vec4 ${funcName}Direct(vec2 uv) {`,
    `  return textureLod(uMaterialTexture${index}, uv, 0.0);`,
    `}`
  ];
  if (isFragment) lines.push(`vec4 ${funcName}(vec2 uv) {`, `  return texture(uMaterialTexture${index}, uv);`, `}`);
  return lines;
}
function createTexturesPluginGl(form) {
  return {
    collectData(context) {
      if (!context.bits.some((b) => b.name.startsWith("materialBindings:"))) context.bits.unshift(materialBindingsBit(context.bits, form));
    },
    injectCode(context) {
      let nextIndex = 0;
      const lines = [];
      const isFragment = context.stage === "fragment";
      for (const bit of context.bits) {
        if (!bit.textures) continue;
        for (const name of bit.textures) {
          const funcName = `sample${name[0].toUpperCase()}${name.slice(1)}`;
          lines.push(...textureGetters(funcName, nextIndex, isFragment));
          nextIndex++;
        }
      }
      return { textureGetters: lines.join("\n") };
    }
  };
}
const scratchDescriptor = new ShaderDescriptor({});
const MATERIAL_PLUGINS = {
  merged: [
    materialStructPackPlugin,
    materialTextureAccessPluginGl,
    createTexturesPluginGl("merged")
  ]
};
const glVertexTemplate = `#version 300 es

{{header}}
{{textureGetters}}

void main() {
  mat4 modelMatrix;

  vec4 position;
  vec3 normal = vec3(0.0, 0.0, 1.0);
  vec3 tangent = vec3(0.0);
  vec2 uv = vec2(0.0);

  {{input}}

  {{storeAccess}}

  {{beforeTransform}}

  vec4 worldPosition = modelMatrix * position;
  mat3 modelMatrix3 = mat3(modelMatrix);

  vec3 normalScale = 1.0 / vec3(
    dot(modelMatrix3[0], modelMatrix3[0]),
    dot(modelMatrix3[1], modelMatrix3[1]),
    dot(modelMatrix3[2], modelMatrix3[2])
  );
  vec3 worldNormal = modelMatrix3 * (normal * normalScale);
  gl_Position = uViewProjectionMatrix * worldPosition;

  {{afterTransform}}

  {{end}}

  vPosition = worldPosition.xyz;
  vNormal   = worldNormal;
  vUV       = uv;
}`;
const glFragmentTemplate = `#version 300 es

{{header}}

{{textureGetters}}

void main() {
  {{declareOutputs}}
  vec3 normal = normalize(vNormal);
  vec3 albedo = vec3(1.0);
  vec3 finalColor;
  float alpha = 1.0;

  {{storeAccess}}

  {{material}}

  finalColor = albedo;

  {{lighting}}

  finalColor *= inputExposure(uExposure, uDisplayExposure);

  {{end}}

  outputs.color = vec4(finalColor * alpha, alpha);

  {{writeOutputs}}
}`;
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
  gl: {
    vertex: glVertexTemplate,
    fragment: glFragmentTemplate
  }
};
var MaterialSystemGl = class {
  /** @ignore */
  static extension = {
    type: [ExtensionType.WebGLSystem],
    name: "material3d"
  };
  batcher = new Mesh3DBatcherGl();
  _destroyed = false;
  _renderer;
  _shaderCache = /* @__PURE__ */ new Map();
  constructor(renderer) {
    this._renderer = renderer;
  }
  computeBatchKey(item, bit) {
    const cache = item._passCache[bit];
    return packGlBatchKey(cache.shader.uid, cache.state, cache.topology);
  }
  compilePassShader(bits, template2) {
    const gl = compileGlslSource({
      bits: [
        globalBitGl,
        cameraBit,
        ...bits
      ],
      template: template2,
      useLocations: false
    });
    assertBindGroups(gl.bits, template2);
    return Shader.from({
      gl,
      groups: {},
      groupMap: gl.groupMap
    });
  }
  compileIsolatedShader(bits, template2, groups) {
    const gl = compileGlslSource({
      bits,
      template: template2,
      useLocations: false
    });
    return Shader.from({
      gl,
      groups,
      groupMap: gl.groupMap
    });
  }
  /**
  * Appends the mesh's position, morph and skinning bits in the order they deform the vertex, and every bit added
  * here joins the cache key. Validation runs on cache hits too, since it checks the material, not the shader.
  */
  compileShader(descriptor, mesh, batch, plugins, validateMaterial = false, glslOptions = { useLocations: false }, form = "direct") {
    const finalBits = [];
    let key = "";
    if (descriptor.includeGlobal ?? true) {
      finalBits.push(globalBitGl);
      key += `${globalBitGl.name}|`;
    }
    if (descriptor.includeCamera ?? true) {
      finalBits.push(cameraBit);
      key += `${cameraBit.name}|`;
    }
    finalBits.push(...descriptor.bitsGl);
    key += descriptor.keyGl;
    const positionBit = getPositionBit(mesh.geometry.attributes.aPosition.format);
    assertBitIdentity(positionBit);
    finalBits.push(positionBit);
    key += `|${positionBit.name}`;
    if (mesh._morph) {
      if (mesh.geometry.hasMorphNormals) {
        finalBits.push(morphTargetNormalBitGl);
        key += "|morphN";
      } else {
        finalBits.push(morphTargetBitGl);
        key += "|morph";
      }
    }
    if (mesh.skeleton) {
      assertBitIdentity(skinningBitGl);
      finalBits.push(skinningBitGl);
      key += `|${skinningBitGl.name}`;
    }
    if (batch.instanceStoreBuffer && readsInstanceData(finalBits)) key += `|inst:${batch.instanceStoreBuffer.layout.key}`;
    key += `|${form}`;
    let entry = this._shaderCache.get(key);
    if (!entry) {
      const gl = compileGlslSource({
        bits: finalBits,
        template: descriptor.template,
        extraPlugins: plugins,
        instanceLayout: batch.instanceStoreBuffer?.layout,
        ...glslOptions,
        overrides: descriptor.overrides,
        outputLocations: descriptor.outputLocations
      });
      assertBindGroups(gl.bits, descriptor.template);
      entry = {
        shader: Shader.from({
          gl,
          groups: {},
          overrides: descriptor.overrides,
          groupMap: gl.groupMap
        }),
        layout: getMaterialLayout(gl.bits)
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
  * Compiles the merged form `Mesh3DBatcherGl` binds, since a per-draw uniform block costs WebGL more. Reads the store
  * per call, as pixi builds pipes after systems; `lastGeometryUid = -1` has a pass with its own shader resolve again.
  */
  ensureMaterial(mesh, batch, view3d) {
    const material = mesh.material;
    this._renderer.renderPipes.view3d.materialStoreBuffer.register(material);
    const shader = this.compileShader(this._materialDescriptor(mesh, view3d), mesh, batch, MATERIAL_PLUGINS.merged, true, { useLocations: false }, "merged");
    const passBit = material._passBit & RenderPassBit.MATERIAL_PASS_MASK;
    const pd = material._passes[passBit];
    const state = pd && pd.state || material.state;
    const topology = pd && pd.topology || material.topology || mesh.geometry.topology;
    const cache = mesh._passCache[passBit];
    if (!cache) mesh._passCache[passBit] = new MeshPassCache(shader, state, topology);
    else {
      cache.shader = shader;
      cache.state = state;
      cache.topology = topology;
      cache.lastGeometryUid = -1;
    }
    return shader;
  }
  /**
  * Bits writing one slot run in list order: normal changes (flat shading, then the normal map), tint and billboard
  * before the material's bits, `alphaOpaqueBit` after them, fog before tone mapping, and the pass's bits last.
  * @returns `scratchDescriptor`, which the next call overwrites
  */
  _materialDescriptor(mesh, view3d) {
    const geo = mesh.geometry;
    const material = mesh.material;
    const fogBit = material.fog ? view3d._fogBit : null;
    const toneBit = view3d._toneMappingBit;
    const vertexColored = !!geo.attributes.aColor && material.vertexColors;
    const colorSpaceBit = selectColorSpaceBit(material, toneBit, !!fogBit || vertexColored);
    const materialDescriptor = material.getPrimaryDescriptor(view3d);
    const bitsGl = [
      globalBitGl,
      layoutBit,
      instanceFetchMaterialBitGl,
      colorSpaceBit
    ];
    if (geo.attributes.aNormal) bitsGl.push(normalBit);
    if (geo.attributes.aUV) bitsGl.push(getUvsBit(geo.attributes.aUV.format));
    if (material.doubleSided) bitsGl.push(doubleSidedNormalBit);
    if (material.flatShading) bitsGl.push(flatShadingBit);
    const normalTexture = material.textures.normal;
    if (normalTexture && normalTexture !== NORMAL_MAP && geo.attributes.aUV) bitsGl.push(geo.attributes.aTangent ? tangentNormalMappingBit : normalMappingBit);
    if (vertexColored) bitsGl.push(vertexColorBit);
    const lit = mesh.material.lit;
    if (mesh.billboardMode !== "none") bitsGl.push(getMeshBillboardBit(mesh.billboardMode, lit));
    const hasTangent = !!geo.attributes.aTangent;
    for (let i = 0; i < materialDescriptor.bitsGl.length; i++) {
      const bit = materialDescriptor.bitsGl[i];
      bitsGl.push(hasTangent ? anisotropyTangentVariant(bit) : bit);
    }
    if (material.alphaMode === "opaque") bitsGl.push(alphaOpaqueBit);
    if (fogBit) bitsGl.push(fogBit);
    if (colorSpaceBit !== displayColorSpaceBit && toneBit) bitsGl.push(material._skipsToneCurve ? srgbEncodeBit : toneBit);
    if (lit) bitsGl.push(mesh.receiveShadow && view3d._hasShadows ? shadowBitsGl[view3d.shadowFilter] : noShadowBit, decodeToLinearBit(toneBit !== null));
    const pass = view3d.passByBit[material._passBit & RenderPassBit.MATERIAL_PASS_MASK];
    const outputLocations = addPassMaterialBits(bitsGl, pass, !!materialDescriptor.template);
    return scratchDescriptor.update({
      bitsGl,
      template: materialDescriptor.template ?? template,
      overrides: {
        HAS_UVS: geo.attributes.aUV ? 1 : 0,
        ...materialDescriptor.overrides
      },
      outputLocations,
      includeGlobal: false
    });
  }
  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    for (const { shader } of this._shaderCache.values()) shader.destroy();
    this._shaderCache = null;
  }
};
function renderForwardBatchesGl(options) {
  const { pipe, bit, bindsMaterial, session, alwaysRebuild, sortBatch } = options;
  const { view3d } = session;
  const batcher = pipe.renderer.material3d.batcher;
  const camera = options.camera ?? view3d.camera;
  const cameraData = getCameraData(camera);
  const cullFrustum = camera.cullFrustum;
  cameraData.setViewport(session.activeViewport);
  for (const batch of view3d._meshBatches) {
    if (!batch.renderData._worldVisible) continue;
    const list = batch.drawLists[bit];
    if (!list) continue;
    const renderables = list.view;
    if (renderables.count === 0) continue;
    let build;
    if (sortBatch) {
      sortBatch(renderables, batch, cameraData.position);
      build = list.isDrawStale() || list.isOrderStale();
    } else build = list.nextBuild(view3d._updateTick, alwaysRebuild);
    if (build) {
      list.claimDrawBuilt();
      batcher.build({
        renderables,
        list,
        globalBindGroup: session.globalBindGroup,
        passBit: bit,
        bindsMaterial
      });
    }
    session.globalBindGroup.setResource(batch.storeBuffer.texture.source, "uMeshStoreTexture");
    if (list.glData.indexTexture) session.globalBindGroup.setResource(list.glData.indexTexture.texture.source, "uRenderInstanceTexture");
    session.globalBindGroup.setResource(batch.instanceStoreBuffer?.texture.source ?? UINT_EMPTY.source, "uInstanceStoreTexture");
    batcher.draw(pipe.renderer, list, batch, cullFrustum, cameraData);
  }
}
const shadowGlobalBitGl = {
  name: "shadowGlobalGl",
  bindings: { global: {
    uBonePitTexture: "texture_2d<f32>",
    uMorphTexture: "texture_2d<f32>",
    uGeometryTexture: "texture_2d<u32>"
  } }
};
const shadowTemplateGl = {
  bindGroups: [{
    name: "global",
    ubo: true
  }, "camera"],
  gl: {
    vertex: `#version 300 es

{{header}}

void main() {
  mat4 modelMatrix;

  vec4 position;
  vec3 normal = vec3(0.0);
  vec3 tangent = vec3(0.0);

  {{input}}

  vec4 worldPosition = modelMatrix * position;
  gl_Position = uViewProjectionMatrix * worldPosition;

  {{end}}
}`,
    fragment: `#version 300 es
out vec4 fragColor;

{{header}}

void main() {
    fragColor = vec4(0.);
}`
  }
};
var ShadowRenderPassGl = class extends ShadowRenderPassBase {
  constructor(options) {
    const shadowState = stateFor3D();
    shadowState.depthTest = true;
    shadowState.culling = true;
    shadowState.clockwiseFrontFace = true;
    shadowState.blend = false;
    super({
      renderer: options.renderer,
      name: "shadow",
      description: "Renders shadow-casting scene geometry into each light shadow map.",
      bit: RenderPassBit.SHADOW,
      shadowMapHandle: options.shadowMapHandle,
      descriptor: {
        shaderDescriptor: {
          bitsGl: [shadowGlobalBitGl, instanceFetchBitGl],
          template: shadowTemplateGl,
          includeGlobal: false
        },
        state: shadowState
      }
    });
  }
  /** WebGL keeps the native [-1, 1] depth range, which `shadowBitsGl` maps to [0, 1] when it samples */
  _applyZRangeFix = false;
  /**
  * Builds lists while any light casts with a claimed slot, hidden or not, and skips `nextBuild` with none, so no list
  * goes stale or is marked built while empty. Layers are bound, not pushed, so `session.activeTarget` is reset.
  */
  render(session) {
    const { view3d, lights } = session;
    if (!lights.find((light) => light.canCastShadow)) return;
    this._bindShadowSource(view3d, this.renderTarget.depthStencilTexture);
    this.pipe.renderer.colorMask.setMask(0);
    const batcher = this.pipe.renderer.material3d.batcher;
    const bindGroup = session.globalBindGroup;
    const hasCaster = lights.some((l) => l.castShadow && l._gpuShadowData && l._shadowDataIndex >= 0);
    for (const batch of view3d._meshBatches) {
      if (!batch.renderData._worldVisible) continue;
      const list = batch.drawLists[this.bit];
      if (!list) continue;
      const renderables = list.view;
      if (renderables.count === 0 || !hasCaster) continue;
      if (list.nextBuild(view3d._updateTick)) {
        list.claimDrawBuilt();
        batcher.build({
          renderables,
          list,
          globalBindGroup: bindGroup,
          passBit: this.bit,
          bindsMaterial: false
        });
      }
    }
    for (const light of lights) {
      if (!castsShadowThisFrame(light)) continue;
      const cascadeCount = cascadeCountFor(light);
      for (let c = 0; c < cascadeCount; c++) {
        const slot = this._cascadeSlot(light, c);
        if (!slot.needsRender) continue;
        const frustum = slot.cameraData.frustum;
        this.pipe.renderer.renderTarget.bind({
          target: this.renderTarget,
          clear: true,
          layer: light._shadowDataIndex + c
        });
        for (const batch of view3d._meshBatches) {
          if (!batch.renderData._worldVisible) continue;
          const list = batch.drawLists[this.bit];
          if (!list || list.view.count === 0) continue;
          bindGroup.setResource(batch.storeBuffer.texture.source, "uMeshStoreTexture");
          if (list.glData.indexTexture) bindGroup.setResource(list.glData.indexTexture.texture.source, "uRenderInstanceTexture");
          batcher.draw(this.pipe.renderer, list, batch, frustum, slot.cameraData);
        }
      }
      this._completeShadowUpdate(light);
    }
    this.pipe.renderer.colorMask.setMask(15);
    session.activeTarget = null;
  }
};
const DEFAULT_FOG_COLOR = 13421772;
const scratchFogColor = new Color();
var View3DPipeGl = class {
  /** @ignore */
  static extension = {
    type: [ExtensionType.WebGLPipes],
    name: "view3d"
  };
  renderer;
  _brdfLutTexture;
  _destroyed = false;
  _colorOutputDraw = null;
  _iblEnvironmentMap = /* @__PURE__ */ new Map();
  /**
  * Unloads rather than destroys the cube: a view's bind group may hold it until the slot rebinds, and pixi warns
  * when a bound resource dies
  */
  _onEnvironmentDestroy = (source) => {
    this._iblEnvironmentMap.get(source)?.source.unload();
    this._iblEnvironmentMap.delete(source);
  };
  _viewport = new Rectangle();
  _sortForwardByDistance = (renderables, batch, cameraPosition) => {
    if (batch.isUserBatch) calculateDistancesFromStore(renderables, cameraPosition, batch.storeBuffer.data, batch.renderData.worldTransform);
    else calculateDistancesFromWorldMatrix(renderables, cameraPosition);
  };
  /** Refilled per pass, then emptied so the pipe holds no frame's session or camera */
  _forwardOptions = {
    pipe: this,
    bit: 0,
    bindsMaterial: false,
    camera: null,
    session: null,
    alwaysRebuild: true,
    sortBatch: void 0
  };
  /** Made in `contextChange`, once the limits system has read `minUniformBufferOffsetAlignment` */
  materialStoreBuffer;
  _morphStoreBuffer = new MorphStoreBuffer();
  geometryDataStoreBuffer = new GeometryDataStoreBuffer();
  atlasPool = GeometryAtlasPool.from({ rebaseIndices: true });
  _managedViews;
  constructor(renderer) {
    this.renderer = renderer;
    this._managedViews = new View3DGCRegistry(renderer);
    renderer.runners.contextChange.add(this);
  }
  /** Keeps an existing store across a context restore, since materials hold places in it */
  contextChange() {
    this.materialStoreBuffer ??= new MaterialDataStoreBuffer({
      alignment: this.renderer.limits.minUniformBufferOffsetAlignment,
      rendererType: this.renderer.type
    });
  }
  createShadowPass(options) {
    return new ShadowRenderPassGl({
      renderer: this.renderer,
      shadowMapHandle: options.shadowMapHandle
    });
  }
  prepareForward(_desc, _session) {
  }
  renderForward(desc, session) {
    const options = this._forwardOptions;
    options.bit = desc.bit;
    options.bindsMaterial = desc.bindsMaterial;
    options.camera = desc.camera;
    options.session = session;
    options.alwaysRebuild = !cachesDrawWork(desc);
    options.sortBatch = desc.sort === "distance" ? this._sortForwardByDistance : void 0;
    renderForwardBatchesGl(options);
    options.camera = null;
    options.session = null;
  }
  renderGeometry(geometry, shader, state) {
    this.renderer.encoder.draw({
      geometry,
      shader,
      state
    });
  }
  /** Sets `gl.viewport` directly: pixi sets it only when a target binds, and rebinding would restart the pass */
  setViewport(viewport) {
    this.renderer.gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
  }
  /**
  * Depth-writable state, applied through pixi's state system so its cache stays in step and 2D's
  * `depthMask: false` doesn't mask the clear
  */
  _depthClearState = null;
  clearDepth(session) {
    if (!this._depthClearState) {
      const state = new State();
      state.depthMask = true;
      state.depthTest = false;
      state.culling = false;
      state.blend = false;
      this._depthClearState = state;
    }
    const gl = this.renderer.gl;
    const vp = session.activeViewport;
    this.renderer.state.set(this._depthClearState);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(vp.x, vp.y, vp.width, vp.height);
    this.renderer.renderTarget.clear(this.renderer.renderTarget.renderTarget, CLEAR.DEPTH);
    gl.disable(gl.SCISSOR_TEST);
  }
  copyColor(source, dest, session) {
    const { target, viewport } = source;
    if (!target.colorTexture) return;
    const frame = dest.frame;
    const resolution = dest.source.resolution;
    this.renderer.renderTarget.copyToTexture(target, dest, {
      x: viewport.x,
      y: viewport.y
    }, {
      width: viewport.width,
      height: viewport.height
    }, {
      x: Math.round(frame.x * resolution),
      y: Math.round(frame.y * resolution)
    });
    session.activeTarget = null;
  }
  /** `finishRenderPass` resolves an antialiased `dest` before anything reads it or builds its mips */
  outputColor(source, dest, session, toneMapping) {
    const { target } = source;
    if (!target.colorTexture) return;
    const renderTargets = this.renderer.renderTarget;
    (this._colorOutputDraw ??= new ColorOutputDraw(this.renderer)).draw(this, source, dest, toneMapping);
    renderTargets.finishRenderPass();
    session.activeTarget = null;
  }
  /** Binds the view's own target first, so the texture isn't the bound colour attachment while its mips regenerate */
  generateMips(handle, session) {
    const source = session.view3d._graph.getTexture(handle, session).source;
    this.renderer.renderTarget.bind({
      target: session.defaultTarget,
      clear: CLEAR.NONE
    });
    session.activeTarget = null;
    source.updateMipmaps();
  }
  /** See `View3DPipe.resolveColor`: pixi's `finishRenderPass` is the blit, and it rebinds the target's framebuffer after */
  resolveColor() {
    this.renderer.renderTarget.finishRenderPass();
  }
  copyDepth(source, dest, session) {
    const { target, viewport } = source;
    if (!target.depthStencilTexture) return;
    this.renderer.renderTarget.copyDepthTexture(target, dest, {
      x: viewport.x,
      y: viewport.y
    }, {
      width: viewport.width,
      height: viewport.height
    }, {
      x: 0,
      y: 0
    });
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
  /** Rebinds the bone pit and the stores every frame, after the scene update, to pick up a texture that growth replaced */
  execute(view3d) {
    if (!view3d.isRenderable) return;
    const glData = getGlobalGlData(view3d, this.renderer);
    const defaultTarget = this.renderer.renderTarget.renderTarget;
    view3d._ensureInitialized(this.renderer, glData, defaultTarget.colorTexture.source.resolution);
    this._managedViews.track(view3d);
    const env = view3d.environment;
    if (env) {
      this._brdfLutTexture ||= generateBrdfLut({ renderer: this.renderer });
      glData.globalBindGroup.setResource(this._brdfLutTexture.source, "uBrdfLutTexture");
    }
    const environmentSource = this._prefilteredEnvironment(env);
    glData.globalBindGroup.setResource(environmentSource, "uEnvironmentTexture");
    glData.globalUniformGroup.uniforms.uEnvironmentMaxMipLevel = environmentSource.mipLevelCount - 1;
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
      globalBindGroup: glData.globalBindGroup,
      globalUniformGroup: glData.globalUniformGroup,
      renderer: this.renderer
    };
    if (!updateView3DScene(view3d, this, renderSession)) return;
    glData.globalBindGroup.setResource(view3d._bonePit.texture.source, "uBonePitTexture");
    glData.globalBindGroup.setResource(this._morphStoreBuffer.texture.source, "uMorphTexture");
    glData.globalBindGroup.setResource(this.geometryDataStoreBuffer.texture.source, "uGeometryTexture");
    this.atlasPool.update();
    this.materialStoreBuffer.update();
    this.geometryDataStoreBuffer.update();
    if (detectSharedCacheInvalidation(this.atlasPool, this.materialStoreBuffer, glData, this._morphStoreBuffer)) view3d._invalidateDrawCaches();
    glData.globalBindGroup.setResource(this.materialStoreBuffer.texture.source, "uMaterialStorage");
    this.prepareView(renderSession);
    view3d._graph.run(renderSession);
  }
  /**
  * Unloads every enrolled view first, so its global bind group goes before the textures it binds. `atlasPool` is
  * process-wide and outlives the renderer (`GeometryAtlasPool.from`).
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
  _updateGlobalUniforms(view3d) {
    const { fog } = view3d;
    const glData = getGlobalGlData(view3d, this.renderer);
    const globalUniforms = glData.globalUniformGroup.uniforms;
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
    glData.globalUniformGroup.update();
  }
};
extensions.add(LightingSystemGl, MaterialSystemGl, View3DPipeGl);
export {
  GL_STATE_KEY_RANGE,
  LightingSystemGl,
  MaterialSystemGl,
  Mesh3DBatcherGl,
  ShadowRenderPassGl,
  View3DPipeGl,
  WGSL_TO_GLSL_BINDING_TYPE,
  WGSL_TO_GLSL_TYPE,
  compileGlslSource,
  createTexturesPluginGl,
  generateGlslStructAccessor,
  getGlobalGlData,
  globalBitGl,
  glslAttributesPlugin,
  glslBindingsPlugin,
  glslFragmentOutputsPlugin,
  glslGroupMapPlugin,
  glslHeadersPlugin,
  glslInterStagePlugin,
  glslOverridesPlugin,
  glslPrecisionPlugin,
  glslStageSlotsPlugin,
  instanceAccessPluginGl,
  mat2ColumnMember,
  materialTextureAccessPluginGl,
  materialUniformAccessPluginGl,
  morphTargetBitGl,
  morphTargetNormalBitGl,
  packGlBatchKey,
  renderForwardBatchesGl,
  shadowBitsGl,
  shadowGlobalBitGl,
  skinningBitGl,
  uniformBlockInstanceName
};
