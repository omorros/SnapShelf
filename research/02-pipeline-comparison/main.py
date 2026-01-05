"""
SnapShelf Console Application - Main CLI Entry Point
AI-powered food inventory management using YOLO and Vision LLM.
"""

import typer
from rich.console import Console
from rich.table import Table
from pathlib import Path
from datetime import date
from typing import List

from services.scan_service import ScanService
from storage.inventory import InventoryStorage
from utils.display import display_items, display_expiring

# Initialize Typer app and Rich console
app = typer.Typer(help="SnapShelf - AI Food Inventory Manager")
console = Console()
storage = InventoryStorage()


@app.command()
def scan(image: Path = typer.Argument(..., help="Path to food image")):
    """
    Scan an image and add detected food items to inventory.

    Args:
        image: Path to the image file containing food items
    """
    # Validate image file exists
    if not image.exists():
        console.print(f"[red]Error: File not found: {image}[/red]")
        raise typer.Exit(1)

    console.print(f"\n[bold]Scanning:[/bold] {image.name}\n")

    # Execute scan with loading indicator
    with console.status("Detecting objects..."):
        scan_service = ScanService()
        items = scan_service.scan_image(str(image))

    # Display results
    if items:
        console.print(f"[green]✓ Added {len(items)} items to inventory:[/green]\n")
        display_items(items)
    else:
        console.print("[yellow]No food items detected in image.[/yellow]")


@app.command()
def list(
    category: str = typer.Option(None, "--category", "-c", help="Filter by category"),
    sort: str = typer.Option("expiry", "--sort", "-s", help="Sort by: expiry, name, added"),
    status: str = typer.Option("active", "--status", help="Filter: active, consumed, discarded")
):
    """
    List all items in inventory.

    Args:
        category: Filter items by category (optional)
        sort: Sort order (expiry, name, or added)
        status: Filter by status (active, consumed, discarded)
    """
    # Get all items with status filter
    items = storage.get_all(status=status)

    # Apply category filter if specified
    if category:
        items = [i for i in items if i.category.lower() == category.lower()]

    # Sort items based on specified field
    if sort == "expiry":
        items.sort(key=lambda x: x.expiry_date or date.max)
    elif sort == "name":
        items.sort(key=lambda x: x.name.lower())
    elif sort == "added":
        items.sort(key=lambda x: x.added_at, reverse=True)

    # Display results
    if items:
        console.print(f"\n[bold]📦 Inventory ({len(items)} items)[/bold]\n")
        display_items(items)
    else:
        console.print("\n[yellow]Inventory is empty.[/yellow]")


@app.command()
def expiring(days: int = typer.Option(7, "--days", "-d", help="Days to look ahead")):
    """
    Show items expiring soon.

    Args:
        days: Number of days to look ahead for expiring items
    """
    # Get expiring items
    items = storage.get_expiring(days=days)

    # Display results
    if items:
        console.print(f"\n[bold]⚠️  Items Expiring (next {days} days)[/bold]\n")
        display_expiring(items)
    else:
        console.print(f"\n[green]No items expiring in the next {days} days.[/green]")


@app.command()
def consume(ids: List[str] = typer.Argument(..., help="Item ID(s) to mark as consumed")):
    """
    Mark item(s) as consumed.

    Args:
        ids: List of item IDs to mark as consumed
    """
    # Process each item ID
    for item_id in ids:
        item = storage.get_by_id(item_id)
        if item:
            storage.update(item_id, {"status": "consumed"})
            console.print(f"[green]✓ Consumed:[/green] {item.name}")
        else:
            console.print(f"[red]Item not found: {item_id}[/red]")


@app.command()
def discard(ids: List[str] = typer.Argument(..., help="Item ID(s) to mark as discarded")):
    """
    Mark item(s) as discarded (wasted).

    Args:
        ids: List of item IDs to mark as discarded
    """
    # Process each item ID
    for item_id in ids:
        item = storage.get_by_id(item_id)
        if item:
            storage.update(item_id, {"status": "discarded"})
            console.print(f"[yellow]✓ Discarded:[/yellow] {item.name}")
        else:
            console.print(f"[red]Item not found: {item_id}[/red]")


@app.command()
def remove(ids: List[str] = typer.Argument(..., help="Item ID(s) to remove")):
    """
    Remove item(s) from inventory.

    Args:
        ids: List of item IDs to permanently remove
    """
    # Process each item ID
    for item_id in ids:
        item = storage.get_by_id(item_id)
        if item:
            storage.remove(item_id)
            console.print(f"[green]✓ Removed:[/green] {item.name}")
        else:
            console.print(f"[red]Item not found: {item_id}[/red]")


@app.command()
def clear(confirm: bool = typer.Option(False, "--confirm", "-y", help="Skip confirmation")):
    """
    Clear all items from inventory.

    Args:
        confirm: Skip confirmation prompt if True
    """
    # Get count of items to clear
    if not confirm:
        items = storage.get_all(status=None)
        if not typer.confirm(f"Clear all {len(items)} items?"):
            raise typer.Abort()

    # Clear inventory
    storage.clear()
    console.print("[green]✓ Inventory cleared[/green]")


if __name__ == "__main__":
    app()
