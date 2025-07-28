#version 300 es
precision highp float;

in vec2 v_uv;

uniform bool u_useTexture;
uniform sampler2D u_texture;
uniform vec3 u_color;

out vec4 outColor;

void main() {
    if (u_useTexture) {
        outColor = texture(u_texture, v_uv);
    } else {
        outColor = vec4(u_color, 1.0);
    }
}
