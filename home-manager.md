# Adding Timewave Condenser to Home Manager

This guide explains how to add Timewave Condenser to your Home Manager configuration, providing a convenient way to have the tool available system-wide.

## Prerequisites

- Home Manager installed and configured
- SSH access to the timewave-computer GitHub organization
- Nix with flakes enabled

## Flake-based Home Manager Setup

If you're using the flake-based approach for Home Manager, add timewave-condenser to your `flake.nix`:

```nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    home-manager.url = "github:nix-community/home-manager";
    home-manager.inputs.nixpkgs.follows = "nixpkgs";
    
    # Add timewave-condenser as an input (using SSH for private repo access)
    timewave-condenser = {
      url = "git+ssh://git@github.com/timewave-computer/timewave-condenser";
      # Optional: If you want to pin a specific version
      # ref = "main"; or ref = "<commit-hash>";
    };
  };

  outputs = { self, nixpkgs, home-manager, timewave-condenser, ... }@inputs:
    {
      homeConfigurations."yourusername" = home-manager.lib.homeManagerConfiguration {
        pkgs = nixpkgs.legacyPackages.x86_64-linux; # or your system
        
        modules = [
          ./home.nix
          
          # Either include it directly here
          {
            home.packages = [ timewave-condenser.packages.${pkgs.system}.default ];
          }
        ];
        
        # Pass the inputs to home-manager modules
        extraSpecialArgs = { inherit inputs; };
      };
    };
}
```

## Adding to your home.nix

If you passed the inputs to your `home.nix`, you can include it there:

```nix
{ config, pkgs, inputs, ... }:

{
  # Your other home-manager config...
  
  home.packages = with pkgs; [
    # Your other packages...
    inputs.timewave-condenser.packages.${pkgs.system}.default
  ];
}
```

## For non-flake Home Manager setup

If you're not using flakes with Home Manager, you can still add it using `builtins.getFlake`:

```nix
{ config, pkgs, ... }:

let
  # You'll need to have flakes enabled in your nix.conf for this to work
  timewave-condenser = (builtins.getFlake "git+ssh://git@github.com/timewave-computer/timewave-condenser").packages.${pkgs.system}.default;
in
{
  # Your other home-manager config...
  
  home.packages = with pkgs; [
    # Your other packages...
    timewave-condenser
  ];
}
```

## Applying your changes

After adding timewave-condenser to your configuration, apply the changes:

```bash
# If using flakes
home-manager switch --flake .#yourusername

# If using traditional approach
home-manager switch
```

After applying these changes, you should be able to run `timewave-condenser` directly from your terminal without any additional commands or prefixes.

## Updates

To update timewave-condenser when new versions are available:

### Flake-based setup

```bash
# Update flake inputs
nix flake update --update-input timewave-condenser

# Apply the changes
home-manager switch --flake .#yourusername
```

### Non-flake setup

Since the package is fetched directly from GitHub, it will update to the latest version when you run `home-manager switch`. 