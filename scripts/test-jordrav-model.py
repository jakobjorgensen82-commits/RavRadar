"""Scientific failure cases for the provisional geological rules."""
import importlib.util
from pathlib import Path
import unittest
import gzip
import json

spec = importlib.util.spec_from_file_location("jordrav_model", Path(__file__).with_name("lib") / "jordrav_model.py")
model = importlib.util.module_from_spec(spec)
spec.loader.exec_module(model)


class GeologicalContract(unittest.TestCase):
    def test_possibility_does_not_require_a_previous_find(self):
        result = model.classify("DS", "DS", "Hedeslette")
        self.assertEqual(result["potential"], "enhanced")
        self.assertEqual(result["confidence"], "weak")

    def test_sand_alone_does_not_award_enhanced(self):
        self.assertEqual(model.classify("DS", "DS", "Bundmoræneflade")["potential"], "possible")

    def test_cover_is_not_replaced_by_promising_deeper_material(self):
        result = model.classify("ES", "DS", "Hedeslette")
        self.assertEqual(result["potential"], "covered")
        self.assertEqual(result["accessibility"], "covered")

    def test_mixed_fields_are_not_flattened_to_sand(self):
        self.assertEqual(model.classify("DS-DL", "DS-DL", "Hedeslette")["potential"], "reworked")
        self.assertEqual(model.classify("DS-DG", "DS-DG", "Hedeslette")["potential"], "enhanced")
        self.assertEqual(model.group("MD"), "unresolved")

    def test_ice_lake_sand_is_not_labelled_as_fine_clay(self):
        self.assertEqual(model.group("ZS"), "glacial-basin-coarse")
        self.assertEqual(model.group("ZG"), "glacial-basin-coarse")
        self.assertEqual(model.group("ZL"), "glacial-fine")

    def test_data_gaps_and_artificial_ground_are_not_low(self):
        for code in ["X", "O", "BY", "RÅ", "PKV", "IA", "TA", ""]:
            self.assertEqual(model.classify(code, "DS", "Hedeslette")["potential"], "unresolved")

    def test_old_mixed_marine_and_freshwater_codes_keep_their_uncertainty(self):
        self.assertEqual(model.classify("HSL", "", "Strandvold", True)["potential"], "coastal")
        self.assertEqual(model.classify("F", "", "Delta", True)["accessibility"], "unknown")
        self.assertEqual(model.classify("F", "", "Delta", True)["potential"], "basin")

    def test_marine_plains_are_designated_nationally_without_place_or_find_input(self):
        for code in ["HS", "HL", "HI", "HS-HL", "HV-L"]:
            for label in ["Marin flade", "Tørlagt marint forland", "Hævet senglacial flade", "Ikke kortlagt"]:
                self.assertEqual(model.classify(code, code, label)["potential"], "coastal")
        self.assertEqual(model.classify("ML", "ML", "Tørlagt marint forland")["potential"], "possible")

    def test_fine_receivers_are_not_excluded_and_are_not_ranked_as_sand(self):
        for code in ["TL", "DI", "ZS", "ZG", "ZL"]:
            self.assertEqual(model.classify(code, code, "Issøflade")["potential"], "basin")
        self.assertEqual(model.classify("FL", "FL", "Bundmoræneflade")["potential"], "basin")
        self.assertEqual(model.classify("ML", "ML", "Issøflade")["potential"], "possible")

    def test_cover_stays_separate_from_receiving_material_and_depth(self):
        for upper, lower, label in [("FT", "TL", "Issøflade"), ("ES", "HS", "Klit"), ("FT", "HS", "Marin flade")]:
            result = model.classify(upper, lower, label)
            self.assertEqual(result["potential"], "covered")
            self.assertEqual(result["accessibility"], "covered")
        self.assertEqual(model.classify("ES", "ES", "Bundmoræneflade")["potential"], "possible")
        self.assertEqual(model.classify("HS", "HS", "Marin flade")["accessibility"], "unknown")

    def test_mixed_cover_keeps_its_material_mixture_and_unknown_thickness(self):
        result = model.classify("HS-FT", "HS-FT", "Marin flade")
        self.assertEqual(result["material"], "mixed")
        self.assertEqual(result["potential"], "covered")
        self.assertNotEqual(result["accessibility"], "near-surface")

    def test_processes_do_not_override_artificial_water_or_unknown_surface(self):
        for label in ["Sø", "Tidevandsflade", "Antropogent landskab"]:
            self.assertEqual(model.classify("HS", "HS", label)["potential"], "unresolved")
        for upper in ["", "MD", "WA", "LR", "LRP"]:
            self.assertEqual(model.classify(upper, "HS", "Marin flade")["potential"], "unresolved")

    def test_reworking_requires_concrete_process_support(self):
        self.assertEqual(model.classify("ML", "ML", "Randmorænebakke")["potential"], "reworked")
        self.assertEqual(model.classify("ML", "ML", "Bundmoræneflade")["potential"], "possible")
        self.assertEqual(model.classify("GC", "GC", "Erosionsdal")["potential"], "reworked")

    def test_chronology_does_not_use_a_numeric_landscape_code(self):
        self.assertEqual(model.landscape_group("Hævet senglacial strandvold"), "shore")
        self.assertEqual(model.landscape_group("Hævet senglacial flade"), "marine")

    def test_bedrock_is_limited_not_absent_amber(self):
        self.assertEqual(model.classify("SK", "SK", "Kalkmassiv")["potential"], "limited")
        for code in ["HAG", "ROG", "PAM", "SVG", "VAG", "EQ", "KQ", "AF"]:
            self.assertEqual(model.classify(code, "", "Grundfjeld", True)["potential"], "limited")
        self.assertEqual(model.classify("RG", "", "Grundfjeld", True)["potential"], "possible")

    def test_brown_coal_is_not_an_amber_bonus(self):
        self.assertEqual(model.classify("GC", "GC", "Ældre moræneflade")["potential"], "possible")

    def test_materialized_explanations_execute_the_current_model_rules(self):
        path=model.ROOT / ("data/jordrav/prototype-"+model.MODEL.split("-")[0]+"/catalog.json.gz")
        with gzip.open(path,"rt",encoding="utf-8") as stream:
            catalog=json.load(stream)
        self.assertEqual(catalog["modelVersion"],model.MODEL)
        for entry in catalog["entries"]:
            result=model.classify(entry["surface"],entry["depth"],entry["landscape"],entry["source"]=="soil-old")
            for key,value in result.items():
                self.assertEqual(entry[key],value,(entry["source"],entry["surface"],entry["landscape"],key))


if __name__ == "__main__":
    unittest.main()
