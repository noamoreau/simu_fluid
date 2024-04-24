var MOUSE_GRAVITY = 5,
  GRAVITY_Y = 1,
  MOUSE_REPEL = false,
  WATER = 400,
  COLOURS = "rgba(97,160,232";

window.requestAnimFrame =
  window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.oRequestAnimationFrame ||
  window.msRequestAnimationFrame ||
  function (callback) {
    window.setTimeout(callback, 1000 / 60);
  };

var fluid = (function () {
  var ctx, width, height, num_x, num_y, particles, grid, meta_ctx;
  var threshold = 220;
  var play = false;
  var spacing = 50;
  var radius = 40;
  var limit = radius;
  var textures;
  var num_particles;

  var mouse = {
    down: false,
    x: 0,
    y: 0,
  };

  var process_image = function () {
    var imageData = meta_ctx.getImageData(0, 0, width, height),
      pix = imageData.data;

    for (var i = 0, n = pix.length; i < n; i += 4) {
      pix[i + 3] < threshold && (pix[i + 3] /= 6);
    }

    ctx.putImageData(imageData, 0, 0);
  };

  var run = function () {
    meta_ctx.clearRect(0, 0, width, height);

    for (var i = 0, l = num_x * num_y; i < l; i++) grid[i].length = 0;

    var i = num_particles;
    while (i--) particles[i].first_process();
    i = num_particles;
    while (i--) particles[i].second_process();

    process_image();

    if (mouse.down) {
      ctx.canvas.style.cursor = "none";
      ctx.fillStyle = "rgba(97, 160, 232, 0.05)";
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, radius * MOUSE_GRAVITY, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "rgba(97, 160, 232, 0.05)";
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, (radius * MOUSE_GRAVITY) / 3, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
    } else ctx.canvas.style.cursor = "default";
    if (play) requestAnimFrame(run);
  };

  var Particle = function (type, x, y) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.px = x;
    this.py = y;
    this.vx = 0;
    this.vy = 0;
  };

  Particle.prototype.first_process = function () {
    var g =
      grid[Math.round(this.y / spacing) * num_x + Math.round(this.x / spacing)];

    if (g) g.close[g.length++] = this;

    this.vx = this.x - this.px;
    this.vy = this.y - this.py;

    if (mouse.down) {
      var dist_x = this.x - mouse.x;
      var dist_y = this.y - mouse.y;
      var dist = Math.sqrt(dist_x * dist_x + dist_y * dist_y);
      if (dist < radius * MOUSE_GRAVITY) {
        var cos = dist_x / dist;
        var sin = dist_y / dist;
        this.vx += MOUSE_REPEL ? cos : -cos;
        this.vy += MOUSE_REPEL ? sin : -sin;
      }
    }

    this.vx += 0;
    this.vy += GRAVITY_Y;
    this.px = this.x;
    this.py = this.y;
    this.x += this.vx;
    this.y += this.vy;
  };

  Particle.prototype.second_process = function () {
    var force = 0,
      force_b = 0,
      cell_x = Math.round(this.x / spacing),
      cell_y = Math.round(this.y / spacing),
      close = [];

    for (var x_off = -1; x_off < 2; x_off++) {
      for (var y_off = -1; y_off < 2; y_off++) {
        var cell = grid[(cell_y + y_off) * num_x + (cell_x + x_off)];
        if (cell && cell.length) {
          for (var a = 0, l = cell.length; a < l; a++) {
            var particle = cell.close[a];
            if (particle != this) {
              var dfx = particle.x - this.x;
              var dfy = particle.y - this.y;
              var distance = Math.sqrt(dfx * dfx + dfy * dfy);
              if (distance < spacing) {
                var m = 1 - distance / spacing;
                force += Math.pow(m, 2);
                force_b += Math.pow(m, 3) / 2;
                particle.m = m;
                particle.dfx = (dfx / distance) * m;
                particle.dfy = (dfy / distance) * m;
                close.push(particle);
              }
            }
          }
        }
      }
    }

    force = (force - 3) * 0.5;

    for (var i = 0, l = close.length; i < l; i++) {
      var neighbor = close[i];

      var press = force + force_b * neighbor.m;
      if (this.type != neighbor.type) press *= 0.35;

      var dx = neighbor.dfx * press * 0.5;
      var dy = neighbor.dfy * press * 0.5;

      neighbor.x += dx;
      neighbor.y += dy;
      this.x -= dx;
      this.y -= dy;
    }

    if (this.x < limit) this.x = limit;
    else if (this.x > width - limit) this.x = width - limit;

    if (this.y < limit) this.y = limit;
    else if (this.y > height - limit) this.y = height - limit;

    this.draw();
  };

  Particle.prototype.draw = function () {
    var size = radius * 2;

    meta_ctx.drawImage(textures, this.x - radius, this.y - radius, size, size);
  };

  return {
    init: function (canvas, w, h) {
      particles = [];
      grid = [];
      close = [];
      textures;

      var canvas = document.getElementById(canvas);
      ctx = canvas.getContext("2d");
      canvas.height = h || window.innerHeight;
      canvas.width = w || window.innerWidth;
      width = canvas.width;
      height = canvas.height;

      var meta_canvas = document.createElement("canvas");
      meta_canvas.width = width;
      meta_canvas.height = height;
      meta_ctx = meta_canvas.getContext("2d");
      textures = document.createElement("canvas");
      textures.width = radius * 2;
      textures.height = radius * 2;
      var nctx = textures.getContext("2d");

      var grad = nctx.createRadialGradient(
        radius,
        radius,
        1,
        radius,
        radius,
        radius
      );

      grad.addColorStop(0, COLOURS + ",1)");
      grad.addColorStop(1, COLOURS + ",0)");
      nctx.fillStyle = grad;
      nctx.beginPath();
      nctx.arc(radius, radius, radius, 0, Math.PI * 2, true);
      nctx.closePath();
      nctx.fill();

      canvas.onmousedown = function (e) {
        mouse.down = true;
        return false;
      };

      canvas.onmouseup = function (e) {
        mouse.down = false;
        return false;
      };

      canvas.onmousemove = function (e) {
        var rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
        return false;
      };

      num_x = Math.round(width / spacing) + 1;
      num_y = Math.round(height / spacing) + 1;

      for (var i = 0; i < num_x * num_y; i++) {
        grid[i] = {
          length: 0,
          close: [],
        };
      }

      for (var k = 0; k < WATER; k++) {
        particles.push(
          new Particle(
            i,
            radius + Math.random() * (width - radius * 2),
            radius + Math.random() * (height - radius * 2)
          )
        );
      }

      num_particles = particles.length;

      play = true;
      run();
    },

    getGravity: function () {
        return GRAVITY_Y;
      },

    setGravity: function (gravity) {
      GRAVITY_Y = gravity;
    },
  };
})();

document.getElementById('zeroGravity').onmousedown = function() {
    if (fluid.getGravity()) {
        fluid.setGravity(0);
    }else {
        fluid.setGravity(1);
    }
}

fluid.init("caca", Window.length, Window.height);
