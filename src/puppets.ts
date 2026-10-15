import { Puppet, type PuppetProject, type PuppetTexture } from "puppetforge";
import bounds from "./puppet-bounds.json";
import { createHitMotion } from "./puppet-motion";

type Character = keyof typeof bounds;
const definitions = new Map<
  Character,
  Promise<{ project: PuppetProject; texture: PuppetTexture | null }>
>();
function definition(id: Character) {
  let promise = definitions.get(id);
  if (!promise) {
    promise = Puppet.load(`/assets/puppets/${id}.zip`).then((p) => ({
      project: p.project,
      texture: p.texture,
    }));
    definitions.set(id, promise);
    promise.catch(() => definitions.delete(id));
  }
  return promise;
}

interface Surface {
  draw(dt: number): void;
  show(animated: boolean): void;
  dispose(): void;
  healthy(): boolean;
}
async function surface(
  image: HTMLImageElement,
  id: Character,
): Promise<Surface> {
  const source = await definition(id);
  const puppet = Puppet.fromProject(source.project, source.texture);
  if (!puppet.mesh || !puppet.texture || !puppet.play("idle"))
    throw Error("Idle puppet unavailable");
  const motion = createHitMotion(puppet);
  const interactive = !!puppet.project.animations.hit;
  const events = new AbortController();
  const canvas = document.createElement("canvas");
  canvas.className = `${image.className} puppet-canvas`;
  canvas.setAttribute("role", interactive ? "button" : "img");
  const action = {
    ko: "눌러서 반응 보기",
    en: "Play reaction",
    ja: "押してリアクション",
  };
  const locale = document.documentElement.lang as keyof typeof action;
  canvas.setAttribute(
    "aria-label",
    interactive ? `${image.alt} — ${action[locale] ?? action.en}` : image.alt,
  );
  canvas.dataset.motion = "idle";
  canvas.style.animation = "none";
  canvas.style.visibility = "hidden";
  const [left, top, right, bottom] = bounds[id].bounds;
  const width = right - left;
  const height = bottom - top;
  canvas.width = Math.round(width);
  canvas.height = Math.round(height);
  canvas.style.aspectRatio = `${width}/${height}`;
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: true,
    premultipliedAlpha: true,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
  });
  if (!gl) throw Error("WebGL unavailable");
  const shaders: WebGLShader[] = [];
  const buffers: WebGLBuffer[] = [];
  let program: WebGLProgram | null = null;
  let texture: WebGLTexture | null = null;
  let bitmap: ImageBitmap | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let disposed = false;
  let contextFailed = false;
  const show = (animated: boolean) => {
    if (disposed) return;
    canvas.style.visibility = animated ? "visible" : "hidden";
    image.style.visibility = animated ? "hidden" : "";
    canvas.setAttribute("aria-hidden", String(!animated));
    canvas.tabIndex = animated && interactive ? 0 : -1;
  };
  const dispose = () => {
    if (disposed) return;
    show(false);
    disposed = true;
    events.abort();
    resizeObserver?.disconnect();
    canvas.remove();
    buffers.forEach((b) => gl.deleteBuffer(b));
    shaders.forEach((s) => gl.deleteShader(s));
    gl.deleteTexture(texture);
    gl.deleteProgram(program);
    bitmap?.close();
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  };
  try {
    const shader = (kind: number, code: string) => {
      const s = gl.createShader(kind);
      if (!s) throw Error("Shader allocation failed");
      shaders.push(s);
      gl.shaderSource(s, code);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        throw Error("Shader compilation failed");
      return s;
    };
    program = gl.createProgram();
    if (!program) throw Error("Program allocation failed");
    gl.attachShader(
      program,
      shader(
        gl.VERTEX_SHADER,
        "attribute vec2 position;attribute vec2 uv;uniform vec4 bounds;varying vec2 vUv;void main(){vec2 p=(position-bounds.xy)/bounds.zw;gl_Position=vec4(p.x*2.0-1.0,1.0-p.y*2.0,0.0,1.0);vUv=uv;}",
      ),
    );
    gl.attachShader(
      program,
      shader(
        gl.FRAGMENT_SHADER,
        "precision mediump float;uniform sampler2D art;varying vec2 vUv;void main(){gl_FragColor=texture2D(art,vUv);}",
      ),
    );
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw Error("Program linking failed");
    gl.useProgram(program);
    const buffer = (target: number, data: BufferSource, usage: number) => {
      const b = gl.createBuffer();
      if (!b) throw Error("Buffer allocation failed");
      buffers.push(b);
      gl.bindBuffer(target, b);
      gl.bufferData(target, data, usage);
      return b;
    };
    const positions = buffer(
      gl.ARRAY_BUFFER,
      new Float32Array(puppet.restVertices),
      gl.DYNAMIC_DRAW,
    );
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    buffer(gl.ARRAY_BUFFER, new Float32Array(puppet.uv), gl.STATIC_DRAW);
    const uv = gl.getAttribLocation(program, "uv");
    gl.enableVertexAttribArray(uv);
    gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 0, 0);
    const indices = puppet.mesh.indices;
    if (puppet.restVertices.length / 2 > 65535)
      throw Error("Unsupported mesh size");
    buffer(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    gl.uniform4f(
      gl.getUniformLocation(program, "bounds"),
      left,
      top,
      width,
      height,
    );
    bitmap = await createImageBitmap(
      new Blob([new Uint8Array(puppet.texture.data)], {
        type: puppet.texture.type,
      }),
    );
    texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
    gl.uniform1i(gl.getUniformLocation(program, "art"), 0);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(
      gl.SRC_ALPHA,
      gl.ONE_MINUS_SRC_ALPHA,
      gl.ONE,
      gl.ONE_MINUS_SRC_ALPHA,
    );
    gl.viewport(0, 0, canvas.width, canvas.height);
    image.after(canvas);
    const resize = () => {
      const box = image.getBoundingClientRect();
      const density = Math.min(devicePixelRatio || 1, 1.5);
      const scale = Math.min(box.width / width, box.height / height) * density;
      const renderHeight = Math.max(
        1,
        Math.min(1600, Math.round(height * scale)),
      );
      const renderWidth = Math.max(
        1,
        Math.round((renderHeight * width) / height),
      );
      if (canvas.width !== renderWidth || canvas.height !== renderHeight) {
        canvas.width = renderWidth;
        canvas.height = renderHeight;
        gl.viewport(0, 0, renderWidth, renderHeight);
      }
    };
    resize();
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(image);
    const hit = () => {
      if (
        disposed || contextFailed || document.hidden ||
        document.body.classList.contains("modal-open") ||
        matchMedia("(prefers-reduced-motion: reduce)").matches ||
        canvas.style.visibility !== "visible"
      ) return;
      if (motion.hit()) canvas.dataset.motion = "hit";
    };
    if (interactive) {
      // Leave native touch scrolling intact; a drag is not a character tap.
      let press: { id: number; x: number; y: number; moved: boolean } | null = null;
      const options = { signal: events.signal };
      canvas.addEventListener("pointerdown", (event) => {
        if (!event.isPrimary || event.button !== 0) return;
        press = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          moved: false,
        };
      }, options);
      canvas.addEventListener("pointermove", (event) => {
        if (
          press?.id === event.pointerId &&
          Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8
        ) press.moved = true;
      }, options);
      canvas.addEventListener("pointercancel", () => { press = null; }, options);
      canvas.addEventListener("pointerleave", () => { press = null; }, options);
      canvas.addEventListener("pointerup", (event) => {
        const tap = press;
        press = null;
        if (
          tap?.id === event.pointerId && !tap.moved &&
          Math.hypot(event.clientX - tap.x, event.clientY - tap.y) <= 8
        ) hit();
      }, options);
      canvas.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        if (!event.repeat) hit();
      }, options);
      // Assistive technology can invoke a button through a synthesized click.
      canvas.addEventListener("click", (event) => { if (event.detail === 0) hit(); }, options);
    }
    const draw = (dt: number) => {
      if (disposed || contextFailed || gl.isContextLost()) return;
      const vertices = puppet.update(dt);
      motion.advance(dt);
      const playing = puppet.playing ?? "idle";
      if (canvas.dataset.motion !== playing) canvas.dataset.motion = playing;
      gl.bindBuffer(gl.ARRAY_BUFFER, positions);
      if (vertices) gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
      show(true);
    };
    canvas.addEventListener(
      "webglcontextlost",
      (event) => {
        event.preventDefault();
        contextFailed = true;
        show(false);
      },
      { once: true },
    );
    draw(0);
    return {
      draw,
      show,
      dispose,
      healthy: () => !disposed && !contextFailed && !gl.isContextLost(),
    };
  } catch (error) {
    dispose();
    throw error;
  }
}

/** Lazy loading and one 30fps scheduler, paused offscreen, in hidden tabs and reduced motion. */
export function mountPuppets(root: ParentNode = document): () => void {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const entries = [
    ...root.querySelectorAll<HTMLImageElement>("img[data-puppet]"),
  ].map((image) => ({
    image,
    id: image.dataset.puppet as Character,
    visible: false,
    loading: false,
    surface: null as Surface | null,
    failed: false,
  }));
  let disposed = false,
    frame = 0,
    last = 0;
  const eligible = () =>
    !disposed &&
    !reduced.matches &&
    !document.hidden &&
    !document.body.classList.contains("modal-open") &&
    entries.some((e) => e.visible && e.surface?.healthy());
  function tick(now: number) {
    frame = 0;
    if (!eligible()) {
      // Some browsers update matches before delivering the media change event.
      // Switch to static art before stopping the last scheduled frame as well.
      if (reduced.matches) entries.forEach((e) => e.surface?.show(false));
      return;
    }
    if (now - last >= 1000 / 30) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      for (const e of entries) if (e.visible) e.surface?.draw(dt);
    }
    frame = requestAnimationFrame(tick);
  }
  function schedule() {
    if (eligible() && !frame) {
      last = performance.now();
      frame = requestAnimationFrame(tick);
    } else if (!eligible() && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }
  async function load(entry: (typeof entries)[number]) {
    if (
      entry.surface ||
      entry.loading ||
      entry.failed ||
      reduced.matches ||
      disposed
    )
      return;
    entry.loading = true;
    try {
      const renderer = await surface(entry.image, entry.id);
      if (disposed) {
        renderer.dispose();
        return;
      }
      entry.surface = renderer;
      renderer.show(entry.visible && !reduced.matches);
      schedule();
    } catch {
      entry.failed = true;
      entry.image.style.visibility = "";
    } finally {
      entry.loading = false;
    }
  }
  const observer = new IntersectionObserver(
    (changes) => {
      for (const change of changes) {
        const entry = entries.find((e) => e.image === change.target)!;
        entry.visible = change.isIntersecting;
        if (entry.visible) void load(entry);
      }
      schedule();
    },
    { rootMargin: "60px 0px" },
  );
  entries.forEach((e) => observer.observe(e.image));
  const onMotion = () => {
    entries.forEach((e) => {
      e.surface?.show(e.visible && !reduced.matches);
      if (e.visible) void load(e);
    });
    schedule();
  };
  reduced.addEventListener("change", onMotion);
  document.addEventListener("visibilitychange", schedule);
  document.addEventListener("garden:modal-change", schedule);
  return () => {
    disposed = true;
    observer.disconnect();
    cancelAnimationFrame(frame);
    reduced.removeEventListener("change", onMotion);
    document.removeEventListener("visibilitychange", schedule);
    document.removeEventListener("garden:modal-change", schedule);
    entries.forEach((e) => e.surface?.dispose());
  };
}
