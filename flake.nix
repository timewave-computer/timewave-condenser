{
  description = "A minimal Repomix-based repository condenser";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      # Define for all standard systems
      allSystems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      
      # For each system
      forAllSystems = f: nixpkgs.lib.genAttrs allSystems (system: f system);
      
      # Get packages for a system
      packagesFor = system: nixpkgs.legacyPackages.${system};
    in
    {
      # Simple packages
      packages = forAllSystems (system: 
        let pkgs = packagesFor system; in {
          default = pkgs.writeShellScriptBin "timewave-condenser" ''
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
        }
      );
      
      # Simple apps that directly reference the scripts
      apps = forAllSystems (system: {
        default = {
          type = "app";
          program = "${self.packages.${system}.default}/bin/timewave-condenser";
        };
      });
      
      # Legacy attributes for compatibility
      defaultPackage = forAllSystems (system: self.packages.${system}.default);
      defaultApp = forAllSystems (system: self.apps.${system}.default);
    };
}
