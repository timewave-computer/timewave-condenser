{
  description = "A minimal Repomix-based repository condenser";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};

        # Create the script  
        condenser = pkgs.writeShellScriptBin "timewave-condenser" ''
          #!/usr/bin/env bash
          set -euo pipefail
          
          if [ "$1" = "help" ] || [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
            echo "Timewave Condenser - A tool to pack git repositories using Repomix"
            echo ""
            echo "Usage: timewave-condenser pack -r REPO_PATH -o OUTPUT_PATH [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -r, --repository PATH    Repository path (required)"
            echo "  -o, --output PATH        Output path (required)"
            echo "  -c, --config PATH        Config file path"
            echo "  -f, --format FORMAT      Output format (markdown, plain, xml)"
            echo "  --compress               Enable compression"
            echo "  --remove-comments        Remove comments"
            echo "  --no-security-check      Disable security check"
            exit 0
          fi
          
          # Ensure NPM and Node are available
          export PATH="${pkgs.nodejs_20}/bin:${pkgs.nodePackages.npm}/bin:$PATH"
          
          # Parse arguments
          REPO_PATH=""
          OUTPUT_PATH=""
          FORMAT="markdown"
          CONFIG=""
          COMPRESS=""
          REMOVE_COMMENTS=""
          NO_SECURITY_CHECK=""
          
          while [[ $# -gt 0 ]]; do
            case "$1" in
              pack) shift ;;
              -r|--repository) REPO_PATH="$2"; shift 2 ;;
              -o|--output) OUTPUT_PATH="$2"; shift 2 ;;
              -f|--format) FORMAT="$2"; shift 2 ;;
              -c|--config) CONFIG="--config $2"; shift 2 ;;
              --compress) COMPRESS="--compress"; shift ;;
              --remove-comments) REMOVE_COMMENTS="--remove-comments"; shift ;;
              --no-security-check) NO_SECURITY_CHECK="--no-security-check"; shift ;;
              *) echo "Unknown argument: $1"; exit 1 ;;
            esac
          done
          
          if [ -z "$REPO_PATH" ]; then
            echo "Error: Repository path is required (-r, --repository)"
            exit 1
          fi
          
          if [ -z "$OUTPUT_PATH" ]; then
            echo "Error: Output path is required (-o, --output)"
            exit 1
          fi
          
          if [ ! -d "$REPO_PATH" ]; then
            echo "Error: Repository path '$REPO_PATH' doesn't exist"
            exit 1
          fi
          
          # Create required directories
          mkdir -p "$OUTPUT_PATH"
          mkdir -p "$REPO_PATH/pack"
          
          # Install repomix if needed
          if ! command -v repomix &> /dev/null; then
            echo "Installing repomix..."
            npm install -g repomix
          fi
          
          # Run repomix
          echo "Running repomix..."
          repomix pack "$REPO_PATH" -o "$OUTPUT_PATH/output.$FORMAT" --style "$FORMAT" $CONFIG $COMPRESS $REMOVE_COMMENTS $NO_SECURITY_CHECK
          
          echo "Pack completed successfully! Output saved to: $OUTPUT_PATH/output.$FORMAT"
        '';

        # Define the package
        package = pkgs.symlinkJoin {
          name = "timewave-condenser";
          paths = [
            condenser
            pkgs.nodejs_20
            pkgs.nodePackages.npm
          ];
        };
      in
      {
        # Define package
        packages.default = package;
        
        # Define app explicitly with type
        apps.default = {
          type = "app";
          program = "${condenser}/bin/timewave-condenser";
        };
        
        # Development shell
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_20
            nodePackages.npm
          ];
          
          shellHook = ''
            echo "Repomix development environment"
            echo "Installing local dependencies..."
            npm install
            # Add node_modules/.bin to PATH to use locally installed binaries
            export PATH="$PWD/node_modules/.bin:$PATH"
            echo "Dependencies installed. You can run your script with 'npm start'"
          '';
        };
      }
    );
}
