#version 300 es
in vec3 a_position;
in vec2 a_uv;
in vec3 a_normal;

uniform mat4 u_modelMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;

out vec2 v_uv;
out vec3 v_normal;
out vec3 v_worldPos;

void main() {
    vec4 worldPos = u_modelMatrix * vec4(a_position, 1.0);
    gl_Position = u_projectionMatrix * u_viewMatrix * worldPos;
    v_uv = a_uv;
    v_worldPos = worldPos.xyz;
    v_normal = mat3(u_modelMatrix) * a_normal; // transform normal
}
