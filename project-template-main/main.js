async function main() {
	await initialize();
	setupSliders();
	requestAnimationFrame(render);
}

let gl;
let program;
let vaoSphere;
let vaoTorus;
let texture;

let uniformModelMatrixLocation;
let uniformViewMatrixLocation;
let uniformProjectionMatrixLocation;
let uniformColorLocation;
let uniformTextureLocation;

let cameraRotation = { x: 15, y: 30 };
let isMouseDown = false;

// Neue Zustände
let rotation = { x: 0, y: 0, z: 0 };
let sliderCameraDistance = 10;

function setupSliders() {
	document.getElementById("slider-rx").addEventListener("input", (e) => {
		rotation.x = e.target.value / 100 * 360;
	});
	document.getElementById("slider-ry").addEventListener("input", (e) => {
		rotation.y = e.target.value / 100 * 360;
	});
	document.getElementById("slider-rz").addEventListener("input", (e) => {
		rotation.z = e.target.value / 100 * 360;
	});
	document.getElementById("slider-camd").addEventListener("input", (e) => {
		sliderCameraDistance = 5 + e.target.value / 100 * 15; // Bereich 5–20
	});
}

function setupCameraRotation() {
	const canvas = document.querySelector("canvas");
	canvas.onmousedown = (e) => { if (e.button === 0) isMouseDown = true; };
	document.onmouseup = () => isMouseDown = false;
	document.onmousemove = (e) => {
		if (isMouseDown) {
			cameraRotation.x += e.movementY * 0.2;
			cameraRotation.y += e.movementX * 0.2;
		}
	};
}

async function initialize() {
	const canvas = document.querySelector("canvas");
	gl = canvas.getContext("webgl2", { alpha: false });
	if (!gl) {
		console.error("WebGL2 not supported");
		return;
	}

	canvas.width = 1000;
	canvas.height = 800;
	gl.viewport(0, 0, canvas.width, canvas.height);
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);

	const vertexShaderText = await loadTextResource("shader.vert");
	const fragmentShaderText = await loadTextResource("shader.frag");
	const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderText);
	const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderText);
	program = createProgram(gl, vertexShader, fragmentShader);

	uniformModelMatrixLocation = gl.getUniformLocation(program, "u_modelMatrix");
	uniformViewMatrixLocation = gl.getUniformLocation(program, "u_viewMatrix");
	uniformProjectionMatrixLocation = gl.getUniformLocation(program, "u_projectionMatrix");
	uniformColorLocation = gl.getUniformLocation(program, "u_color");
	uniformTextureLocation = gl.getUniformLocation(program, "u_texture");

	setupCameraRotation();

	// === VAO für Sphere ===
	vaoSphere = gl.createVertexArray();
	gl.bindVertexArray(vaoSphere);

	const sphereIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereIndexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(sphereMesh.indices), gl.STATIC_DRAW);

	const spherePosBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, spherePosBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereMesh.positions), gl.STATIC_DRAW);
	const posLoc = gl.getAttribLocation(program, "a_position");
	gl.enableVertexAttribArray(posLoc);
	gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

	if (sphereMesh.uvs) {
		const sphereUVBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, sphereUVBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereMesh.uvs), gl.STATIC_DRAW);
		const uvLoc = gl.getAttribLocation(program, "a_uv");
		gl.enableVertexAttribArray(uvLoc);
		gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);
	}

	gl.bindVertexArray(null);

	// === VAO für Torus ===
	vaoTorus = gl.createVertexArray();
	gl.bindVertexArray(vaoTorus);

	const torusIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, torusIndexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(torusMesh.indices), gl.STATIC_DRAW);

	const torusPosBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, torusPosBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(torusMesh.positions), gl.STATIC_DRAW);
	const torusPosLoc = gl.getAttribLocation(program, "a_position");
	gl.enableVertexAttribArray(torusPosLoc);
	gl.vertexAttribPointer(torusPosLoc, 3, gl.FLOAT, false, 0, 0);

	gl.bindVertexArray(null);

	// === Textur laden ===
	texture = gl.createTexture();
	const image = new Image();
	image.src = "compgrafik.png";
	image.onload = () => {
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
		gl.generateMipmap(gl.TEXTURE_2D);

		requestAnimationFrame(render);
	};
}

function render(time) {
	gl.clearColor(0.1, 0.1, 0.1, 1);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.useProgram(program);

	const canvas = document.querySelector("canvas");
	const aspect = canvas.width / canvas.height;
	const projection = perspective(45, aspect, 0.1, 100);
	const view = mat4Mul(
		mat4Translation(0, 0, -sliderCameraDistance),
		mat4Mul(mat4RotX(cameraRotation.x * Math.PI / 180), mat4RotY(cameraRotation.y * Math.PI / 180))
	);

	gl.uniformMatrix4fv(uniformViewMatrixLocation, true, view);
	gl.uniformMatrix4fv(uniformProjectionMatrixLocation, true, projection);

	// === SPHERE ===
	const modelSphere = mat4Mul(
		mat4Translation(-1.5, 0, 0),
		mat4Mul(
			mat4RotX(rotation.x * Math.PI / 180),
			mat4Mul(mat4RotY(rotation.y * Math.PI / 180), mat4RotZ(rotation.z * Math.PI / 180))
		)
	);
	gl.uniformMatrix4fv(uniformModelMatrixLocation, true, modelSphere);
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.uniform1i(uniformTextureLocation, 0);

	gl.bindVertexArray(vaoSphere);
	gl.drawElements(gl.TRIANGLES, sphereMesh.indices.length, gl.UNSIGNED_SHORT, 0);

	// === TORUS ===
	const modelTorus = mat4Mul(
		mat4Translation(1.5, 0, 0),
		mat4Mul(
			mat4RotX(rotation.x * Math.PI / 180),
			mat4Mul(mat4RotY(rotation.y * Math.PI / 180), mat4RotZ(rotation.z * Math.PI / 180))
		)
	);
	gl.uniformMatrix4fv(uniformModelMatrixLocation, true, modelTorus);
	gl.uniform3fv(uniformColorLocation, [0.2, 0.6, 1.0]);

	gl.bindVertexArray(vaoTorus);
	gl.drawElements(gl.TRIANGLES, torusMesh.indices.length, gl.UNSIGNED_SHORT, 0);

	gl.bindVertexArray(null);
	gl.useProgram(null);

	requestAnimationFrame(render);
}

main();
