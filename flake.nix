{
  description = "A Repomix-based repository condenser";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        
        # Create the condenser script
        condenser = pkgs.writeScriptBin "timewave-condenser" ''
          #!/usr/bin/env bash
          set -euo pipefail

          # Usage information function
          usage() {
            echo "Timewave Condenser - A tool to pack git repositories using Repomix"
            echo ""
            echo "Usage: timewave-condenser [COMMAND] [OPTIONS]"
            echo ""
            echo "Commands:"
            echo "  pack     Pack a repository (default)"
            echo "  help     Show this help message"
            echo ""
            echo "Options for 'pack':"
            echo "  -r, --repository PATH    Path to the git repository to pack (required)"
            echo "  -c, --config PATH        Path to a Repomix config file (optional)"
            echo "  -o, --output PATH        Path where output files will be placed (default: ./output)"
            echo "  -f, --format FORMAT      Output format: markdown, plain, xml (default: markdown)"
            echo "  --compress               Enable code compression"
            echo "  --remove-comments        Remove comments from code"
            echo "  --no-security-check      Disable security check"
            echo ""
            echo "Examples:"
            echo "  timewave-condenser pack -r ~/projects/myrepo -o ~/outputs"
            echo "  timewave-condenser pack -r ~/projects/myrepo -c ~/repomix-config.json -f plain"
            echo ""
            echo "Running from GitHub (Nix only):"
            echo "  # For public repositories:"
            echo "  nix run github:timewave-computer/timewave-condenser -- pack -r ~/projects/myrepo -o ~/outputs"
            echo ""
            echo "  # For private repositories (using SSH):"
            echo "  nix run git+ssh://git@github.com/timewave-computer/timewave-condenser -- pack -r ~/projects/myrepo -o ~/outputs"
            echo ""
            exit 1
          }

          # Default values
          COMMAND="pack"
          REPO_PATH=""
          CONFIG_PATH=""
          OUTPUT_PATH="./output"
          FORMAT="markdown"
          COMPRESS=0
          REMOVE_COMMENTS=0
          SECURITY_CHECK=1

          # Parse command if present
          if [[ $# -gt 0 && ! "$1" =~ ^- ]]; then
            COMMAND="$1"
            shift
          fi

          # Show help if requested
          if [[ "$COMMAND" == "help" ]]; then
            usage
          fi

          # Ensure pack is a valid command
          if [[ "$COMMAND" != "pack" ]]; then
            echo "Error: Unknown command '$COMMAND'"
            usage
          fi

          # Parse arguments
          while [[ $# -gt 0 ]]; do
            case "$1" in
              -r|--repository)
                REPO_PATH="$2"
                shift 2
                ;;
              -c|--config)
                CONFIG_PATH="$2"
                shift 2
                ;;
              -o|--output)
                OUTPUT_PATH="$2"
                shift 2
                ;;
              -f|--format)
                FORMAT="$2"
                shift 2
                ;;
              --compress)
                COMPRESS=1
                shift
                ;;
              --remove-comments)
                REMOVE_COMMENTS=1
                shift
                ;;
              --no-security-check)
                SECURITY_CHECK=0
                shift
                ;;
              *)
                echo "Error: Unknown option '$1'"
                usage
                ;;
            esac
          done

          # Validate required arguments
          if [[ -z "$REPO_PATH" ]]; then
            echo "Error: Repository path (-r, --repository) is required"
            usage
          fi

          # Ensure the repository path exists
          if [[ ! -d "$REPO_PATH" ]]; then
            echo "Error: Repository path '$REPO_PATH' does not exist or is not a directory"
            exit 1
          fi

          # Ensure the output directory exists
          mkdir -p "$OUTPUT_PATH"
          
          # Repomix requires a pack directory to exist
          mkdir -p "$REPO_PATH/pack"

          # Build the command
          CMD="npx repomix pack \"$REPO_PATH\" -o \"$OUTPUT_PATH/output.$FORMAT\" --style $FORMAT"

          # Add optional parameters
          if [[ -n "$CONFIG_PATH" ]]; then
            CMD="$CMD --config \"$CONFIG_PATH\""
          fi

          if [[ $COMPRESS -eq 1 ]]; then
            CMD="$CMD --compress"
          fi

          if [[ $REMOVE_COMMENTS -eq 1 ]]; then
            CMD="$CMD --remove-comments"
          fi

          if [[ $SECURITY_CHECK -eq 0 ]]; then
            CMD="$CMD --no-security-check"
          fi

          # Execute the command
          echo "Running: $CMD"
          eval "$CMD"

          echo ""
          echo "Pack completed successfully! Output saved to: $OUTPUT_PATH/output.$FORMAT"
        '';

        # Define the package with all dependencies
        package = pkgs.buildEnv {
          name = "timewave-condenser";
          paths = [
            condenser
            pkgs.nodejs_20
            pkgs.nodePackages.npm
          ];
          pathsToLink = [ "/bin" ];
        };
      in
      {
        # Use consistent attribute naming
        packages = {
          default = package;
          timewave-condenser = package;
        };

        # Define the app explicitly
        apps = {
          default = {
            type = "app";
            program = "${package}/bin/timewave-condenser";
          };
        };

        # Keep the development shell
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
