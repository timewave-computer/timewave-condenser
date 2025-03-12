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

        # Example configuration file
        exampleConfig = pkgs.writeTextFile {
          name = "repomix-example-config.json";
          text = ''
            {
              "include": [
                "src/main.py",
                "src/utils/",
                "docs/"
              ],
              "exclude": [
                "**/*.test.js",
                "**/*.spec.ts",
                "**/node_modules/",
                "**/.git/"
              ],
              "outputs": [
                {
                  "format": "markdown",
                  "path": "condensed-output.md",
                  "options": {
                    "removeComments": true,
                    "compress": true
                  }
                },
                {
                  "format": "xml",
                  "path": "condensed-output.xml",
                  "options": {
                    "removeComments": true,
                    "compress": false,
                    "claudeOptimized": true,
                    "addLineNumbers": true,
                    "separateByLanguage": true
                  }
                }
              ],
              "settings": {
                "ignoreEmptyFiles": true,
                "maxFileSize": 1048576,
                "includeFilePath": true,
                "skipBinaryFiles": true,
                "securityCheck": true
              }
            }
          '';
        };

        # Create the script  
        condenser = pkgs.writeShellScriptBin "timewave-condenser" ''
          #!/usr/bin/env bash
          set -euo pipefail
          
          # Print help message
          print_help() {
            echo "Timewave Condenser - A tool to pack git repositories using Repomix"
            echo ""
            echo "Usage: timewave-condenser COMMAND [OPTIONS]"
            echo ""
            echo "Commands:"
            echo "  pack             Pack a repository"
            echo "  help             Show this help message"
            echo "  example-config   Print an example configuration file"
            echo ""
            echo "Options for 'pack' command:"
            echo "  -r, --repository PATH    Repository path (required)"
            echo "  -o, --output PATH        Output path (required)"
            echo "  -c, --config PATH        Config file path"
            echo "  -f, --format FORMAT      Output format (markdown, plain, xml)"
            echo "  --compress               Enable compression"
            echo "  --remove-comments        Remove comments"
            echo "  --no-security-check      Disable security check"
            echo "  --verbose                Show verbose output for debugging"
            exit 0
          }
          
          # Print example usage
          print_example() {
            echo "Example usage with configuration file:"
            echo ""
            echo "1. Create a repomix.config.json file with the following content:"
            echo ""
            cat "${exampleConfig}"
            echo ""
            echo "2. Run the condenser with the config file:"
            echo "   timewave-condenser pack -r ./my-repo -o ./output -c ./repomix.config.json"
            echo ""
            echo "This will:"
            echo "- Process only src/main.py, src/utils/ directory, and docs/ directory"
            echo "- Exclude test files and node_modules"
            echo "- Create two outputs:"
            echo "  * A markdown file at './output/condensed-output.md'"
            echo "  * An XML file optimized for Claude at './output/condensed-output.xml'"
            exit 0
          }
          
          # Create default config file
          create_default_config() {
            local config_path="$1"
            local output_dir="$2"
            echo "Creating default config file at $config_path"
            cat > "$config_path" << 'EOFCONFIG'
{
  "include": [
    "**/*"
  ],
  "exclude": [
    "**/.git/",
    "**/node_modules/"
  ],
  "outputs": [
    {
      "format": "markdown",
      "path": "OUTPUTDIR_PLACEHOLDER/condensed-output.md",
      "options": {
        "removeComments": true,
        "compress": true
      }
    },
    {
      "format": "xml",
      "path": "OUTPUTDIR_PLACEHOLDER/condensed-output.xml",
      "options": {
        "removeComments": true,
        "compress": false,
        "claudeOptimized": true,
        "addLineNumbers": true,
        "separateByLanguage": true
      }
    }
  ],
  "settings": {
    "ignoreEmptyFiles": true,
    "maxFileSize": 1048576,
    "includeFilePath": true,
    "skipBinaryFiles": true,
    "securityCheck": true
  }
}
EOFCONFIG
            # Replace the placeholder with the actual output directory
            sed -i.bak "s|OUTPUTDIR_PLACEHOLDER|$output_dir|g" "$config_path"
          }
          
          # Check for command
          if [ $# -eq 0 ]; then
            print_help
          fi
          
          COMMAND="$1"
          shift
          
          case "$COMMAND" in
            help) print_help ;;
            example-config) print_example ;;
            pack) ;; # Continue with pack command
            *) echo "Unknown command: $COMMAND"; exit 1 ;;
          esac
          
          # Parse arguments
          REPO_PATH=""
          OUTPUT_PATH=""
          FORMAT="markdown"
          CONFIG_PATH=""
          COMPRESS=""
          REMOVE_COMMENTS=""
          NO_SECURITY_CHECK=""
          VERBOSE=false
          
          while [[ $# -gt 0 ]]; do
            case "$1" in
              -r|--repository) REPO_PATH="$2"; shift 2 ;;
              -o|--output) OUTPUT_PATH="$2"; shift 2 ;;
              -f|--format) FORMAT="$2"; shift 2 ;;
              -c|--config) CONFIG_PATH="$2"; shift 2 ;;
              --compress) COMPRESS="--compress"; shift ;;
              --remove-comments) REMOVE_COMMENTS="--remove-comments"; shift ;;
              --no-security-check) NO_SECURITY_CHECK="--no-security-check"; shift ;;
              --verbose) VERBOSE=true; shift ;;
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
          
          # Convert to absolute paths
          REPO_PATH=$(realpath "$REPO_PATH")
          OUTPUT_PATH=$(realpath "$OUTPUT_PATH")
          
          if [ ! -d "$REPO_PATH" ]; then
            echo "Error: Repository path '$REPO_PATH' doesn't exist"
            exit 1
          fi
          
          # Create output directory if it doesn't exist
          mkdir -p "$OUTPUT_PATH"
          
          # Create a temporary working directory
          TEMP_DIR=$(mktemp -d)
          cd "$TEMP_DIR"
          
          # Ensure cleanup on exit
          trap 'rm -rf "$TEMP_DIR"' EXIT
          
          # Create the structure Repomix expects
          mkdir -p pack
          
          # Ensure NPM and Node are available
          export PATH="${pkgs.nodejs_20}/bin:${pkgs.nodePackages.npm}/bin:$PATH"
          
          # Install repomix in the temporary directory
          echo "Installing repomix..."
          npm install repomix
          
          # Handle config file
          CONFIG_PARAM=""
          HAS_CONFIG=false
          
          # Define default output files
          MD_OUTPUT_FILE="$OUTPUT_PATH/condensed-output.md"
          XML_OUTPUT_FILE="$OUTPUT_PATH/condensed-output.xml"
          DEFAULT_OUTPUT_FILE="$OUTPUT_PATH/output.$FORMAT"
          
          # Always create a default config file in the temporary directory
          CONFIG_FILENAME="repomix.config.json"
          create_default_config "./$CONFIG_FILENAME" "$OUTPUT_PATH"
          CONFIG_PARAM="--config ./$CONFIG_FILENAME"
          HAS_CONFIG=true
          
          # Show configuration for debugging
          if [ "$VERBOSE" = true ]; then
            echo "Using configuration file with content:"
            cat "./$CONFIG_FILENAME"
          fi
          
          # Execute repomix using the local installation
          echo "Running repomix..."
          EXIT_CODE=0
          
          if [ -f "./node_modules/.bin/repomix" ]; then
            ./node_modules/.bin/repomix pack "$REPO_PATH" --style "$FORMAT" $CONFIG_PARAM $COMPRESS $REMOVE_COMMENTS $NO_SECURITY_CHECK || EXIT_CODE=$?
          elif [ -f "./node_modules/repomix/bin/repomix.js" ]; then
            node "./node_modules/repomix/bin/repomix.js" pack "$REPO_PATH" --style "$FORMAT" $CONFIG_PARAM $COMPRESS $REMOVE_COMMENTS $NO_SECURITY_CHECK || EXIT_CODE=$?
          else
            echo "Error: Cannot find repomix executable."
            exit 1
          fi
          
          # Check if repomix succeeded
          if [ $EXIT_CODE -eq 0 ]; then
            echo "Pack completed successfully!"
            
            # Check if the output files were created in the current directory instead
            if [ -f "./condensed-output.md" ]; then
              echo "Found output file in current directory, copying to output directory..."
              cp "./condensed-output.md" "$MD_OUTPUT_FILE"
            fi
            
            if [ -f "./condensed-output.xml" ]; then
              echo "Found output file in current directory, copying to output directory..."
              cp "./condensed-output.xml" "$XML_OUTPUT_FILE"
            fi
            
            # Look for files in the current directory and copy them to the output directory
            if [ -f "./repomix-output.md" ]; then
              echo "Found default output file, copying to output directory..."
              cp "./repomix-output.md" "$MD_OUTPUT_FILE"
            fi
            
            # Check if the files now exist in the output directory
            if [ -f "$MD_OUTPUT_FILE" ] || [ -f "$XML_OUTPUT_FILE" ]; then
              echo "Output files:"
              if [ -f "$MD_OUTPUT_FILE" ]; then
                echo "  - $MD_OUTPUT_FILE (Markdown format)"
              fi
              if [ -f "$XML_OUTPUT_FILE" ]; then
                echo "  - $XML_OUTPUT_FILE (XML format optimized for Claude)"
              fi
            else
              echo "Warning: No output files were found in the output directory."
              echo "Repomix may have created files in a different location."
              echo "Searching for output files in the current directory..."
              ls -la
            fi
          else
            echo "Error: Repomix failed with exit code $EXIT_CODE"
            exit $EXIT_CODE
          fi
        '';

        # Define the package
        package = pkgs.symlinkJoin {
          name = "timewave-condenser";
          paths = [
            condenser
            pkgs.nodejs_20
            pkgs.nodePackages.npm
            pkgs.coreutils  # For realpath
            exampleConfig   # Include example config
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
            coreutils  # For realpath
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
