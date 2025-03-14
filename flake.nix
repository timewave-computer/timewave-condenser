{
  description = "A minimal repository condenser for CI and local development";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        # Development shell for local use and CI
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_20
            nodePackages.npm
            coreutils
          ];
          
          shellHook = ''
            if [ -t 1 ]; then
              echo "Timewave Condenser development environment"
              echo "Installing dependencies..."
              npm install
              # Ensure OpenAI SDK is installed
              if ! npm list openai > /dev/null 2>&1; then
                echo "Installing OpenAI SDK..."
                npm install openai@^4.24.1
              fi
              # Add node_modules/.bin to PATH
              export PATH=$PWD/node_modules/.bin:$PATH
              echo "Dependencies installed. You can run your script with 'npm start'"
            else
              # For CI environments, just set up PATH without interactive messages
              export PATH=$PWD/node_modules/.bin:$PATH
              # Still ensure OpenAI SDK is installed in CI
              npm install openai@^4.24.1 --no-progress --silent || true
            fi
          '';
        };
      }
    );
} 