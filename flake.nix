{
  description = "Whitepages API documentation";

  inputs = {
    # Pinned to a nixpkgs rev that provides bun 1.3.4, for reproducible
    # builds (nixos-unstable tracks newer, less-tested bun releases).
    nixpkgs.url = "github:NixOS/nixpkgs/addf7cf5f383a3101ecfba091b98d0a1263dc9b8";
    flake-utils.url = "github:numtide/flake-utils";
    bun2nix = {
      url = "github:nix-community/bun2nix/c843f477b15f51151f8c6bcc886954699440a6e1";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
    bun2nix,
  }:
    flake-utils.lib.eachSystem [
      "x86_64-linux"
      "aarch64-linux"
      "x86_64-darwin"
      "aarch64-darwin"
    ] (system: let
      pkgs = nixpkgs.legacyPackages.${system};
      bun2nixPkgs = bun2nix.packages.${system}.default;
    in {
      packages.corpus = pkgs.stdenv.mkDerivation {
        pname = "whitepages-api-docs-corpus";
        version = "1.0.0";

        # Flakes include only git-tracked files, so the gitignored build dirs
        # (node_modules, .next, .source, corpus) are already excluded.
        src = ./.;

        nativeBuildInputs = [pkgs.bun bun2nixPkgs.hook];

        # Hermetic dependencies: bun2nix turns bun.lock into fixed-output
        # derivations (bun.nix) fetched into the Nix store, so the build
        # installs offline with no network access.
        bunDeps = bun2nixPkgs.fetchBunDeps {
          bunNix = ./bun.nix;
        };

        # The bun2nix hook would otherwise auto-install and build; we drive
        # the install and the corpus generation ourselves.
        bunNodeModulesInstallPhase = "echo 'skip: installed in buildPhase'";
        bunLifecycleScriptsPhase = "echo 'skip: no lifecycle scripts needed'";
        dontUseBunBuild = true;

        dontConfigure = true;

        buildPhase = ''
          runHook preBuild
          export HOME="$TMPDIR"
          bun install --frozen-lockfile --backend=copyfile
          bun run generate:corpus
          runHook postBuild
        '';

        installPhase = ''
          runHook preInstall
          mkdir -p "$out"
          cp -r corpus/. "$out/"
          runHook postInstall
        '';
      };

      packages.default = self.packages.${system}.corpus;

      devShells.default = pkgs.mkShell {
        packages = with pkgs; [
          bun
          # Node 22 is the project's supported Node version.
          nodejs_22
          just
          ripgrep
          alejandra
          statix
          # Regenerates bun.nix from bun.lock (`just check-bun-nix`).
          bun2nixPkgs
        ];
      };

      formatter = pkgs.alejandra;
    });
}
