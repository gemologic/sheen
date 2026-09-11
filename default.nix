{ pkgs ? import
    (fetchTarball {
      # nixup: pin=jpetrucciani/nix;
      name = "jpetrucciani-2026-09-06";
      url = "https://github.com/jpetrucciani/nix/archive/6953a249aef5c98944830e9e89c3e530b955ba9f.tar.gz";
      sha256 = "1q9q113i5dcr3ga9cnl9gkqraa7xwwcw8d217bm53vlhn0282wgr";
    })
    { }

}:
let
  name = "sheen";
  node = pkgs.nodejs_24;

  envVars = {
    NIXUP = "0.0.15";
    PLAYWRIGHT_SKIP_BROWSER_GC = "1";
    SHEEN_NIX_WEBKIT = "1";
    LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath (with pkgs; [
      glib
      nss
      nspr
      dbus
      atk
      at-spi2-atk
      cups
      libdrm
      expat
      libxkbcommon
      libx11
      libxcomposite
      libxdamage
      libxext
      libxfixes
      libxrandr
      libxcb
      libgbm
      alsa-lib
      pango
      cairo
      systemd
      at-spi2-core
      gtk4
      gdk-pixbuf
      harfbuzz
      harfbuzzFull
      vulkan-loader
      graphene
      icu74
      libxml2_13
      sqlite
      libxslt
      lcms2
      libevent
      libopus
      libgcrypt
      libgpg-error
      gst_all_1.gstreamer
      gst_all_1.gst-plugins-base
      gst_all_1.gst-plugins-bad
      gst_all_1.gst-plugins-good
      flite
      libwebp
      libavif
      libepoxy
      libjpeg8
      libpng
      zlib
      freetype
      fontconfig
      wayland
      libmanette
      enchant_2
      libtasn1
      hyphen
      libsecret
      libpsl
      nghttp2
      stdenv.cc.cc.lib
    ]);
  };
  tools = with pkgs; {
    cli = [
      jfmt
      nixup
    ];
    node = [ node pnpm typescript-language-server ];
    scripts = pkgs.lib.attrsets.attrValues scripts;
  };

  scripts = with pkgs; {
    sheen-install = pog {
      name = "sheen-install";
      description = "Install the locked sheen workspace dependencies";
      runtimeInputs = [ node pnpm ];
      script = ''pnpm install "$@"'';
    };
    sheen-check = pog {
      name = "sheen-check";
      description = "Lint, typecheck, test, and build sheen";
      runtimeInputs = [ node pnpm ];
      script = ''pnpm check "$@"'';
    };
    sheen-test = pog {
      name = "sheen-test";
      description = "Run targeted sheen tests";
      runtimeInputs = [ node pnpm ];
      script = ''pnpm test "$@"'';
    };
    sheen-browser = pog {
      name = "sheen-browser";
      description = "Run sheen browser tests with the pinned Playwright browser";
      runtimeInputs = [ node pnpm ];
      script = ''
        export LD_LIBRARY_PATH="${envVars.LD_LIBRARY_PATH}"
        export PLAYWRIGHT_SKIP_BROWSER_GC=1
        pnpm test:browser "$@"
      '';
    };
    sheen-webkit = pog {
      name = "sheen-webkit";
      description = "Run the cross-engine WebKit qualification suite";
      runtimeInputs = [ node pnpm ];
      script = ''pnpm test:webkit "$@"'';
    };
    sheen-benchmark = pog {
      name = "sheen-benchmark";
      description = "Run the calibrated DataTable benchmark with the pinned Playwright browser";
      runtimeInputs = [ node pnpm ];
      script = ''
        export LD_LIBRARY_PATH="${envVars.LD_LIBRARY_PATH}"
        export PLAYWRIGHT_SKIP_BROWSER_GC=1
        pnpm benchmark:table "$@"
      '';
    };
    sheen-benchmark-date = pog {
      name = "sheen-benchmark-date";
      description = "Run the calibrated date-overlay benchmark with the pinned Playwright browser";
      runtimeInputs = [ node pnpm ];
      script = ''
        export LD_LIBRARY_PATH="${envVars.LD_LIBRARY_PATH}"
        export PLAYWRIGHT_SKIP_BROWSER_GC=1
        pnpm benchmark:date "$@"
      '';
    };
    sheen-benchmark-chart = pog {
      name = "sheen-benchmark-chart";
      description = "Run the calibrated chart benchmark with the pinned Playwright browser";
      runtimeInputs = [ node pnpm ];
      script = ''
        export LD_LIBRARY_PATH="${envVars.LD_LIBRARY_PATH}"
        export PLAYWRIGHT_SKIP_BROWSER_GC=1
        pnpm benchmark:chart "$@"
      '';
    };
    sheen-benchmark-composer = pog {
      name = "sheen-benchmark-composer";
      description = "Run the calibrated Composer continuity benchmark with the pinned Playwright browser";
      runtimeInputs = [ node pnpm ];
      script = ''
        export LD_LIBRARY_PATH="${envVars.LD_LIBRARY_PATH}"
        export PLAYWRIGHT_SKIP_BROWSER_GC=1
        pnpm benchmark:composer "$@"
      '';
    };
    sheen-package-check = pog {
      name = "sheen-package-check";
      description = "Inspect every public package inventory without publishing";
      runtimeInputs = [ node pnpm ];
      script = ''pnpm check:packages "$@"'';
    };
  };
  paths = pkgs.lib.flatten [ (builtins.attrValues tools) ];
  env = pkgs.buildEnv {
    inherit name paths; buildInputs = paths;
  };
in
(env.overrideAttrs (old: {
  inherit name;
  env = (old.env or { }) // envVars;
})) // { inherit scripts; }
