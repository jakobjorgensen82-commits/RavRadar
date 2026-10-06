"""Geology parser regressions for absent data and incomplete depth boundaries."""
import importlib.util, unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('public_sources',Path(__file__).with_name('audit-jordrav-public-sources.py'))
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
HEADER='<tr><th>Top*</th><th>Bund*</th><th>Top**</th><th>Bund**</th><th>DGU-symbol</th><th>Beskrivelse</th></tr>'
def page(top,bottom,code='sand - s'):
    return '<h4>Geologi</h4><table>'+HEADER+f'<tr><td>{top}</td><td>{bottom}</td><td>2</td><td>-3</td><td>{code}</td><td>(sand).</td></tr></table>'
class GeologyParser(unittest.TestCase):
    def test_missing_geology_never_inherits_construction_table(self):
        html='<h4>Geologi</h4><p>Ingen oplysninger fundet...</p><h4>Boringsopbygning</h4><table>'+HEADER+'<tr><td>0</td><td>50</td></tr></table>'
        self.assertEqual(module.geology(html),[])
    def test_incomplete_boundaries_remain_explicit(self):
        row=module.geology(page('0','','ukendt lag, oplysninger mangler - x'))[0]
        self.assertEqual(row['top_m'],0);self.assertIsNone(row['bottom_m']);self.assertTrue(row['missingBounds']);self.assertEqual(row['code'],'x')
    def test_comma_depths_are_metres_below_terrain_not_elevation(self):
        row=module.geology(page('1,8','2,4','gytje,&nbsp;dynd,&nbsp;slam&nbsp;-&nbsp;p'))[0]
        self.assertEqual((row['top_m'],row['bottom_m']),(1.8,2.4));self.assertFalse(row['missingBounds']);self.assertEqual(row['code'],'p')
    def test_reversed_or_nonfinite_intervals_fail(self):
        for top,bottom in [('4','3'),('-2','1'),('nan','5')]:
            with self.assertRaises(ValueError):module.geology(page(top,bottom))
    def test_unexpected_table_schema_fails(self):
        with self.assertRaisesRegex(ValueError,'schema'):module.geology('<h4>Geologi</h4><table><tr><th>Changed</th></tr></table>')
if __name__=='__main__':unittest.main()
