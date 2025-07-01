#!/usr/bin/env python3
import sys
import os
import pdfplumber
import re
from decimal import Decimal

# Add the server services directory to the path
sys.path.append('server/services')

def debug_line_34900(pdf_path):
    """Debug Line 34900 extraction for Emilie's PDF"""
    print(f"Debugging Line 34900 extraction for: {pdf_path}")
    
    # Extract text from PDF
    text = ""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        print(f"Error reading PDF: {e}")
        return
    
    print(f"Total text length: {len(text)} characters")
    
    # Look for any lines containing 34900 or 0.79
    lines = text.splitlines()
    print("\n=== Lines containing '34900' ===")
    for i, line in enumerate(lines):
        if '34900' in line:
            print(f"Line {i}: {line}")
    
    print("\n=== Lines containing '0.79' ===")
    for i, line in enumerate(lines):
        if '0.79' in line:
            print(f"Line {i}: {line}")
    
    print("\n=== Lines containing 'donation' or 'gift' ===")
    for i, line in enumerate(lines):
        if 'donation' in line.lower() or 'gift' in line.lower():
            print(f"Line {i}: {line}")
    
    # Try the general extraction pattern used by _extract_line_amount
    line_num = '34900'
    print(f"\n=== Testing general extraction pattern for line {line_num} ===")
    
    # Pattern 1: Basic line number followed by amount
    pattern1 = rf'{line_num}\s+(\d{{1,3}}(?:,\d{{3}})*)\s+(\d{{2}})'
    matches1 = re.findall(pattern1, text)
    print(f"Pattern 1 matches: {matches1}")
    
    # Pattern 2: More flexible amount pattern
    pattern2 = rf'{line_num}.*?(\d+\.?\d*)'
    matches2 = re.findall(pattern2, text)
    print(f"Pattern 2 matches: {matches2}")
    
    # Pattern 3: Look for the exact value 0.79 near line 34900
    if '34900' in text and '0.79' in text:
        print("Both 34900 and 0.79 found in text - checking proximity")
        
        # Find positions
        pos_34900 = text.find('34900')
        pos_079 = text.find('0.79')
        print(f"Position of '34900': {pos_34900}")
        print(f"Position of '0.79': {pos_079}")
        print(f"Distance: {abs(pos_34900 - pos_079)} characters")
        
        # Check context around both
        if pos_34900 >= 0:
            start = max(0, pos_34900 - 100)
            end = min(len(text), pos_34900 + 100)
            print(f"Context around 34900:\n{text[start:end]}")
        
        if pos_079 >= 0:
            start = max(0, pos_079 - 100) 
            end = min(len(text), pos_079 + 100)
            print(f"Context around 0.79:\n{text[start:end]}")

if __name__ == "__main__":
    pdf_path = "uploads/24bcffaf8be9d252b2c53de83f0accbc"
    debug_line_34900(pdf_path)