#!/usr/bin/env python3
"""
Japanese Font Detection Tool
Uses Tesseract OCR to extract Japanese text and compares with font samples using SSIM.
"""

import cv2
import numpy as np
import pytesseract
from PIL import Image, ImageDraw, ImageFont
import os
import json
from pathlib import Path
from typing import List, Tuple, Dict
from skimage.metrics import structural_similarity as ssim
import matplotlib.pyplot as plt


class JapaneseFontDetector:
    """Main class for Japanese font detection from uploaded images."""
    
    def __init__(self, font_samples_dir: str = "font_samples"):
        self.font_samples_dir = Path(font_samples_dir)
        self.font_samples_dir.mkdir(exist_ok=True)
        self.font_database = {}
        self.load_font_database()
    
    def extract_japanese_text(self, image_path: str) -> List[Dict]:
        """
        Extract Japanese text regions using Tesseract OCR.
        
        Args:
            image_path: Path to input image
            
        Returns:
            List of dictionaries containing text and bounding box info
        """
        # Configure Tesseract for Japanese with optimized settings
        custom_config = r'--oem 3 --psm 6 -l jpn+eng'
        
        # Load and preprocess image
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Could not load image: {image_path}")
        
        # Preprocessing for better OCR accuracy
        preprocessed = self._preprocess_image_for_ocr(image)
        rgb_image = cv2.cvtColor(preprocessed, cv2.COLOR_BGR2RGB)
        
        # Check if Japanese language support is available
        if not self._check_tesseract_language_support():
            raise RuntimeError(
                "Japanese language support not found in Tesseract. "
                "Please install Japanese language data (jpn.traineddata)"
            )
        
        # Get detailed OCR data
        try:
            data = pytesseract.image_to_data(rgb_image, config=custom_config, output_type=pytesseract.Output.DICT)
        except pytesseract.TesseractError as e:
            raise RuntimeError(f"Tesseract OCR failed: {e}")
        
        text_regions = []
        for i in range(len(data['text'])):
            if int(data['conf'][i]) > 30:  # Confidence threshold
                text = data['text'][i].strip()
                if text and self._is_japanese_text(text):
                    text_regions.append({
                        'text': text,
                        'x': data['left'][i],
                        'y': data['top'][i],
                        'w': data['width'][i],
                        'h': data['height'][i],
                        'conf': data['conf'][i]
                    })
        
        return text_regions
    
    def _is_japanese_text(self, text: str) -> bool:
        """Check if text contains Japanese characters."""
        japanese_ranges = [
            (0x3040, 0x309F),  # Hiragana
            (0x30A0, 0x30FF),  # Katakana
            (0x4E00, 0x9FAF),  # CJK Unified Ideographs
        ]
        
        for char in text:
            char_code = ord(char)
            for start, end in japanese_ranges:
                if start <= char_code <= end:
                    return True
        return False
    
    def _preprocess_image_for_ocr(self, image: np.ndarray) -> np.ndarray:
        """
        Preprocess image to improve OCR accuracy for Japanese text.
        
        Args:
            image: Input image
            
        Returns:
            Preprocessed image
        """
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (3, 3), 0)
        
        # Apply adaptive threshold to handle varying lighting
        thresh = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        
        # Invert if background is dark (most text is black on white)
        if np.mean(thresh) < 127:
            thresh = cv2.bitwise_not(thresh)
        
        # Convert back to BGR for consistency
        processed = cv2.cvtColor(thresh, cv2.COLOR_GRAY2BGR)
        
        return processed
    
    def _check_tesseract_language_support(self) -> bool:
        """Check if Japanese language support is available in Tesseract."""
        try:
            langs = pytesseract.get_languages()
            return 'jpn' in langs
        except Exception:
            return False
    
    def extract_text_regions(self, image_path: str, text_regions: List[Dict]) -> List[np.ndarray]:
        """
        Extract and crop text regions from the original image.
        
        Args:
            image_path: Path to original image
            text_regions: List of text region data from OCR
            
        Returns:
            List of cropped text images
        """
        image = cv2.imread(image_path)
        cropped_images = []
        
        for region in text_regions:
            x, y, w, h = region['x'], region['y'], region['w'], region['h']
            # Add padding around text
            padding = 10
            x_start = max(0, x - padding)
            y_start = max(0, y - padding)
            x_end = min(image.shape[1], x + w + padding)
            y_end = min(image.shape[0], y + h + padding)
            
            cropped = image[y_start:y_end, x_start:x_end]
            if cropped.size > 0:
                cropped_images.append(cropped)
        
        return cropped_images
    
    def generate_font_samples(self, font_paths: List[str] = None, sample_texts: List[str] = None, 
                            font_size: int = 32) -> None:
        """
        Generate font sample images for comparison.
        If no font_paths provided, uses system fonts automatically.
        
        Args:
            font_paths: List of paths to font files (optional)
            sample_texts: List of sample Japanese texts (optional)
            font_size: Size of font for sample generation
        """
        # Import here to avoid circular imports
        from japanese_font_generator import JapaneseFontGenerator
        
        # Use automatic font detection if no paths provided
        if font_paths is None:
            generator = JapaneseFontGenerator()
            system_fonts = generator.get_system_japanese_fonts()
            font_paths = [info['path'] for info in system_fonts.values()]
            
            if not font_paths:
                raise RuntimeError("No Japanese fonts found on system. Please install Japanese fonts.")
        
        # Use default sample texts if none provided
        if sample_texts is None:
            sample_texts = [
                "あいうえお", "こんにちは", "日本語", "フォント",
                "明朝体", "ゴシック", "カタカナ", "ひらがな"
            ]
        
        print(f"Generating samples for {len(font_paths)} fonts...")
        
        for font_path in font_paths:
            font_name = Path(font_path).stem
            font_dir = self.font_samples_dir / font_name
            font_dir.mkdir(exist_ok=True)
            
            try:
                font = ImageFont.truetype(font_path, font_size)
                
                for i, text in enumerate(sample_texts):
                    # Create image with text
                    img_width, img_height = 200, 100
                    img = Image.new('RGB', (img_width, img_height), color='white')
                    draw = ImageDraw.Draw(img)
                    
                    # Calculate text position (center)
                    bbox = draw.textbbox((0, 0), text, font=font)
                    text_width = bbox[2] - bbox[0]
                    text_height = bbox[3] - bbox[1]
                    x = (img_width - text_width) // 2
                    y = (img_height - text_height) // 2
                    
                    draw.text((x, y), text, font=font, fill='black')
                    
                    # Save sample
                    sample_path = font_dir / f"sample_{i}.png"
                    img.save(sample_path)
                
                # Update font database
                self.font_database[font_name] = {
                    'path': font_path,
                    'samples': list(font_dir.glob("*.png"))
                }
                
            except Exception as e:
                print(f"Error generating samples for {font_name}: {e}")
        
        self.save_font_database()
    
    def compare_with_ssim(self, text_image: np.ndarray, font_name: str) -> float:
        """
        Compare text image with font samples using SSIM.
        
        Args:
            text_image: Cropped text image
            font_name: Name of font to compare against
            
        Returns:
            Average SSIM score
        """
        if font_name not in self.font_database:
            return 0.0
        
        # Convert to grayscale
        if len(text_image.shape) == 3:
            text_gray = cv2.cvtColor(text_image, cv2.COLOR_BGR2GRAY)
        else:
            text_gray = text_image
        
        ssim_scores = []
        sample_paths = self.font_database[font_name]['samples']
        
        for sample_path in sample_paths:
            sample_img = cv2.imread(str(sample_path), cv2.IMREAD_GRAYSCALE)
            if sample_img is None:
                continue
            
            # Resize images to same size for comparison
            target_size = (100, 50)
            text_resized = cv2.resize(text_gray, target_size)
            sample_resized = cv2.resize(sample_img, target_size)
            
            # Calculate SSIM
            score = ssim(text_resized, sample_resized)
            ssim_scores.append(score)
        
        return np.mean(ssim_scores) if ssim_scores else 0.0
    
    def compare_with_cnn(self, text_image: np.ndarray) -> List[Tuple[str, float]]:
        """
        Compare text image with font samples using CNN embeddings.
        
        Args:
            text_image: Cropped text image
            
        Returns:
            List of (font_name, similarity_score) tuples
        """
        try:
            from cnn_font_similarity import CNNFontEmbedder, FontEmbeddingDatabase
            
            # Initialize CNN embedder
            embedder = CNNFontEmbedder(model_type="mobilenet")
            db = FontEmbeddingDatabase(embedder, "font_embeddings.pkl")
            
            # Save temporary image for CNN processing
            temp_path = "temp_query.png"
            cv2.imwrite(temp_path, text_image)
            
            # Find similar fonts
            results = db.find_similar_fonts(temp_path, top_k=10)
            
            # Clean up
            import os
            if os.path.exists(temp_path):
                os.remove(temp_path)
            
            return results
            
        except ImportError:
            print("CNN dependencies not available. Install TensorFlow and scikit-learn.")
            return []
        except Exception as e:
            print(f"CNN comparison failed: {e}")
            return []
    
    def detect_font(self, image_path: str, method: str = "ssim") -> List[Tuple[str, float]]:
        """
        Main function to detect fonts in uploaded image.
        
        Args:
            image_path: Path to uploaded image
            method: Comparison method ("ssim" or "cnn")
            
        Returns:
            List of (font_name, confidence_score) tuples, top 3 candidates
        """
        # Step 1: Extract Japanese text regions
        text_regions = self.extract_japanese_text(image_path)
        if not text_regions:
            return []
        
        # Step 2: Extract text region images
        cropped_images = self.extract_text_regions(image_path, text_regions)
        if not cropped_images:
            return []
        
        # Step 3: Compare with font samples using selected method
        if method == "cnn":
            # Use CNN-based comparison
            font_scores = {}
            for text_img in cropped_images:
                cnn_results = self.compare_with_cnn(text_img)
                for font_name, score in cnn_results:
                    if font_name not in font_scores:
                        font_scores[font_name] = []
                    font_scores[font_name].append(score)
            
            # Average scores across all text regions
            for font_name in font_scores:
                font_scores[font_name] = np.mean(font_scores[font_name])
        
        else:
            # Use SSIM-based comparison (default)
            font_scores = {}
            for font_name in self.font_database:
                scores = []
                for text_img in cropped_images:
                    score = self.compare_with_ssim(text_img, font_name)
                    scores.append(score)
                
                if scores:
                    font_scores[font_name] = np.mean(scores)
        
        # Step 4: Return top 3 candidates
        sorted_fonts = sorted(font_scores.items(), key=lambda x: x[1], reverse=True)
        return sorted_fonts[:3]
    
    def load_font_database(self) -> None:
        """Load font database from JSON file."""
        db_path = self.font_samples_dir / "font_database.json"
        if db_path.exists():
            with open(db_path, 'r', encoding='utf-8') as f:
                self.font_database = json.load(f)
    
    def save_font_database(self) -> None:
        """Save font database to JSON file."""
        db_path = self.font_samples_dir / "font_database.json"
        with open(db_path, 'w', encoding='utf-8') as f:
            # Convert Path objects to strings for JSON serialization
            db_copy = {}
            for font_name, data in self.font_database.items():
                db_copy[font_name] = {
                    'path': data['path'],
                    'samples': [str(p) for p in data['samples']]
                }
            json.dump(db_copy, f, ensure_ascii=False, indent=2)


def main():
    """Example usage of the Japanese Font Detector."""
    detector = JapaneseFontDetector()
    
    # Example: Generate font samples (run this once to set up)
    sample_texts = ["こんにちは", "日本語", "フォント", "漢字ひらがな"]
    font_paths = [
        # Add paths to your Japanese font files here
        # Example: "/System/Library/Fonts/Hiragino Sans GB.ttc"
    ]
    
    if font_paths:
        print("Generating font samples...")
        detector.generate_font_samples(font_paths, sample_texts)
    
    # Example: Detect fonts in an image
    image_path = "input_image.jpg"  # Replace with actual image path
    if os.path.exists(image_path):
        print(f"Detecting fonts in {image_path}...")
        results = detector.detect_font(image_path)
        
        print("\nTop 3 font candidates:")
        for i, (font_name, score) in enumerate(results, 1):
            print(f"{i}. {font_name}: {score:.3f}")
    else:
        print("Please provide an image file to analyze.")


if __name__ == "__main__":
    main()